import type { Place } from '../data/schema';
import { NIGHTS_PER_STOP, ROUTE } from './config';
import { km, pathKm, permutations } from './geo';
import { transportOptions } from './transport';
import type { Ctx, Inputs, Scored, Stop } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const strong = (p: Place, id: keyof Place['interests']) => (p.interests[id] ?? 0) >= 3;
export const isCity = (p: Place) => strong(p, 'city') && !strong(p, 'strand');
export const isBeachRest = (p: Place) => strong(p, 'strand') || (strong(p, 'ruhe') && !strong(p, 'city'));

export function radiusFor(p: Place, ctx: Ctx): number {
  return ctx.area(p) === 'Europa' ? ROUTE.radiusKm.Europa : ROUTE.radiusKm.default;
}

/** Anzahl Stopps aus Reisedauer und Tempo */
export function stopCount(days: number, pace: Inputs['pace'], available: number): number {
  const totalNights = days - 1;
  const n = Math.round(totalNights / NIGHTS_PER_STOP[pace]);
  return clamp(n, Math.min(ROUTE.minStops, available), Math.min(ROUTE.maxStops, available, totalNights));
}

/** Automatische Route aus der Rangliste */
export function buildRoute(ranked: Scored[], inp: Inputs, ctx: Ctx): Stop[] {
  if (!ranked.length) return [];
  const totalNights = inp.days - 1;
  const n = stopCount(inp.days, inp.pace, ranked.length);
  const scoreOf = new Map(ranked.map((s) => [s.place.id, s.total]));
  const score = (p: Place) => scoreOf.get(p.id) ?? 0;

  // 1. Anker + Cluster: nächstbester Score im Umkreis eines gewählten Orts.
  //    Liegt um den besten Ort zu wenig, wird der nächstbeste Ort als Anker probiert –
  //    so entsteht keine „Route“ mit nur einem Stopp.
  const clusterFrom = (anchor: Place) => {
    const radius = radiusFor(anchor, ctx);
    const list: Place[] = [anchor];
    while (list.length < n) {
      const next = ranked.find((s) => !list.includes(s.place) && list.some((q) => km(q, s.place) <= radius));
      if (!next) break;
      list.push(next.place);
    }
    return list;
  };
  let picked: Place[] = [];
  for (const cand of ranked.slice(0, ROUTE.anchorTries)) {
    const list = clusterFrom(cand.place);
    if (list.length > picked.length) picked = list;
    if (picked.length >= n) break;
  }
  const radius = radiusFor(picked[0], ctx);
  const near = (p: Place, list: Place[]) => list.some((q) => km(q, p) <= radius);

  // 2. Mischung: jede gewählte Vorliebe mindestens einmal mit Stärke 3
  for (const id of inp.interests) {
    if (picked.some((p) => strong(p, id)) || picked.length < 2) continue;
    const weakest = picked.slice(1).sort((a, b) => score(a) - score(b))[0];
    const rest = picked.filter((p) => p !== weakest);
    const cand = ranked.find((s) => !picked.includes(s.place) && strong(s.place, id) && near(s.place, rest));
    if (!cand) continue;
    // Nicht ersetzen, wenn der schwächste Stopp als einziger eine andere Vorliebe abdeckt
    const lost = inp.interests.filter(
      (i) => i !== id && strong(weakest, i) && !rest.some((q) => strong(q, i)) && !strong(cand.place, i),
    );
    if (lost.length) continue;
    picked[picked.indexOf(weakest)] = cand.place;
  }

  // 3.–5. Reihenfolge, Nächte, Plausibilität
  let order = orderStops(picked, ctx);
  let stops = distributeNights(order, totalNights, score);
  const maxTransit = ROUTE.maxTransitShare * ROUTE.wakeHoursPerDay * inp.days;
  while (stops.length > ROUTE.minStops) {
    const legs = order.slice(1).map((p, i) => transportOptions(
      { place: order[i], area: ctx.area(order[i]) },
      { place: p, area: ctx.area(p) },
      inp.style,
    ));
    const hours = legs.map((l) => l.options.find((o) => o.recommended)!.hours);
    if (hours.reduce((s, h) => s + h, 0) <= maxTransit) break;
    // Stopp mit dem längsten Anfahrtsweg streichen (nie den Start)
    let worst = 0;
    hours.forEach((h, i) => { if (h > hours[worst]) worst = i; });
    order = orderStops(order.filter((_, i) => i !== worst + 1), ctx);
    stops = distributeNights(order, totalNights, score);
  }
  return stops;
}

/**
 * Reihenfolge: kürzester Weg (bei höchstens 6 Stopps alle Reihenfolgen durchprobiert), bei dem ein
 * Ort mit (internationalem) Flughafen am Anfang oder am Ende liegt – für An- oder Abreise.
 * Ein Strand-/Ruhe-Ort kommt ans Ende, wenn der Weg dadurch höchstens 20 % länger wird;
 * ein Start ganz ohne Flughafen wird leicht benachteiligt.
 */
export function orderStops(places: Place[], _ctx?: Ctx): Place[] {
  if (places.length <= 1) return places.slice();
  const bestRank = Math.max(...places.map(startRank));
  const gateway = (p: Place) => startRank(p) === bestRank;
  let best: Place[] = [];
  let bestCost = Infinity;
  let beach: Place[] = [];
  let beachCost = Infinity;
  for (const route of permutations(places)) {
    const first = route[0];
    const last = route[route.length - 1];
    if (!gateway(first) && !gateway(last)) continue;
    const cost = pathKm(route) * (startRank(first) === 0 ? 1.15 : 1);
    const endsBeach = isBeachRest(last);
    if (cost < bestCost - 1e-6 || (Math.abs(cost - bestCost) <= 1e-6 && endsBeach && !isBeachRest(best[best.length - 1]))) {
      bestCost = cost;
      best = route;
    }
    if (endsBeach && cost < beachCost) { beachCost = cost; beach = route; }
  }
  if (beach.length && !isBeachRest(best[best.length - 1]) && beachCost <= bestCost * ROUTE.beachEndDetour) return beach;
  return best;
}

function startRank(p: Place): number {
  return p.transport.intlAirport ? 2 : p.transport.airport ? 1 : 0;
}

/**
 * Nächte gleichmäßig verteilen, Rest an die Orte mit höchstem Score.
 * Städte höchstens 3 Nächte, ein Strand-Endstopp mindestens 4.
 */
export function distributeNights(order: Place[], totalNights: number, score: (p: Place) => number): Stop[] {
  const n = order.length;
  if (!n) return [];
  const nights = order.map(() => Math.floor(totalNights / n));
  const byScore = order.map((_, i) => i).sort((a, b) => score(order[b]) - score(order[a]));
  for (let r = 0; r < totalNights - nights[0] * n; r++) nights[byScore[r % n]]++;

  const give = (amount: number, eligible: (i: number) => boolean) => {
    let left = amount;
    for (let guard = 0; left > 0 && guard < 100; guard++) {
      let moved = false;
      for (const i of byScore) {
        if (left > 0 && eligible(i)) { nights[i]++; left--; moved = true; }
      }
      if (!moved) break;
    }
    return left;
  };

  // Städte deckeln
  let excess = 0;
  order.forEach((p, i) => {
    if (isCity(p) && nights[i] > ROUTE.cityMaxNights) {
      excess += nights[i] - ROUTE.cityMaxNights;
      nights[i] = ROUTE.cityMaxNights;
    }
  });
  const left = give(excess, (i) => !isCity(order[i]) && nights[i] < ROUTE.maxNights);
  if (left > 0) give(left, (i) => nights[i] < ROUTE.maxNights); // nur Städte übrig

  // Strand am Ende: mindestens 4 Nächte, von den Stopps mit den meisten Nächten nehmen
  const last = n - 1;
  if (n > 1 && strong(order[last], 'strand')) {
    while (nights[last] < ROUTE.beachEndMinNights) {
      const donor = nights
        .map((v, i) => ({ v, i }))
        .filter(({ v, i }) => i !== last && v > 2)
        .sort((a, b) => b.v - a.v)[0];
      if (!donor) break;
      nights[donor.i]--;
      nights[last]++;
    }
  }
  return order.map((p, i) => ({ placeId: p.id, nights: nights[i] }));
}
