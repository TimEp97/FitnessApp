import type { Place } from '../data/schema';
import { MONTHS_FULL, REASON } from '../i18n/de';
import {
  A_PTS, BUDGET_PTS, COUPLE_BOOST, DEFAULT_WEIGHTS, DIVERSITY, FLIGHT_PTS, MUST_WEIGHT,
  PARTY_WEIGHTS, STYLE_PRICE, W_PTS, flightColumn, type Weights,
} from './config';
import { codeAt } from './climate';
import type { Ctx, Inputs, Party, ScoreParts, Scored, Style } from './types';
import { INTEREST_LABEL } from './labels';

export function weightsFor(party: Party): Weights {
  return PARTY_WEIGHTS[party] ?? DEFAULT_WEIGHTS;
}

/** Durchschnitt der Tag-Stärken über die gewählten Vorlieben, gewichtet (0–100) */
export function matchScore(p: Place, inp: Pick<Inputs, 'interests' | 'mustHave' | 'party'>): number {
  let sum = 0;
  let wsum = 0;
  for (const id of inp.interests) {
    if (inp.party === 'familie' && id === 'nightlife') continue;
    let w = 1;
    if (id === inp.mustHave) w = MUST_WEIGHT;
    if (inp.party === 'paar' && (id === 'ruhe' || id === 'stays')) w *= COUPLE_BOOST;
    sum += w * (((p.interests[id] ?? 0) / 3) * 100);
    wsum += w;
  }
  return wsum ? sum / wsum : 0;
}

export function budgetScore(priceLevel: 1 | 2 | 3, style: Style): number {
  const diff = priceLevel - STYLE_PRICE[style];
  if (diff === 0) return BUDGET_PTS.match;
  if (diff < 0) return BUDGET_PTS.cheaper;
  return BUDGET_PTS.pricier[Math.min(diff, 2) - 1];
}

export function flightScore(hours: number, days: number): number {
  const row = FLIGHT_PTS.find((r) => hours <= r.maxHours)!;
  return row.pts[flightColumn(days)];
}

export function eventFor(p: Place, inp: Pick<Inputs, 'month' | 'interests'>) {
  return p.events?.find((e) => e.month === inp.month && (!e.interest || inp.interests.includes(e.interest)));
}

export function scorePlace(p: Place, inp: Inputs, ctx: Ctx): Scored {
  const code = codeAt(ctx.climate(p), inp.month);
  const parts: ScoreParts = {
    W: W_PTS[code],
    P: matchScore(p, inp),
    A: A_PTS[Number(p.crowd[inp.month])],
    B: budgetScore(p.priceLevel, inp.style),
    F: flightScore(p.flightHoursFromDE, inp.days),
    E: eventFor(p, inp) ? 100 : 0,
  };
  const w = weightsFor(inp.party);
  const total = Math.round(
    w.W * parts.W + w.P * parts.P + w.A * parts.A + w.B * parts.B + w.F * parts.F + w.E * parts.E,
  );
  return { place: p, total, parts, reasons: buildReasons(p, parts, inp, ctx) };
}

/** Die zwei stärksten Teile plus der schwächste als Textbausteine */
export function buildReasons(p: Place, parts: ScoreParts, inp: Inputs, ctx: Ctx): string {
  const w = weightsFor(inp.party);
  const month = MONTHS_FULL[inp.month];
  const code = codeAt(ctx.climate(p), inp.month);
  const matched = inp.interests.filter((id) => (p.interests[id] ?? 0) >= 2).map((id) => INTEREST_LABEL[id]);
  const ev = eventFor(p, inp);

  const text: Record<keyof ScoreParts, (good: boolean) => string> = {
    W: () => REASON.W[code](month),
    P: (good) => (good && matched.length ? REASON.P(joinList(matched)) : REASON.Pweak),
    A: (good) => (good ? REASON.A.low : REASON.A.high),
    B: () => {
      const d = p.priceLevel - STYLE_PRICE[inp.style];
      return d === 0 ? REASON.B.ok : d < 0 ? REASON.B.cheap : REASON.B.pricey;
    },
    F: (good) => (good ? REASON.F.short(p.flightHoursFromDE) : REASON.F.long(p.flightHoursFromDE)),
    E: () => (ev ? REASON.E(ev.name) : ''),
  };

  const keys = (Object.keys(parts) as (keyof ScoreParts)[]).filter((k) => w[k] > 0 && !(k === 'E' && !ev));
  // stark = gewichteter Beitrag hoch und Punkte ≥ 60
  const strong = keys
    .filter((k) => parts[k] >= 60)
    .sort((a, b) => w[b] * parts[b] - w[a] * parts[a])
    .slice(0, 2);
  const weakest = keys.filter((k) => !strong.includes(k)).sort((a, b) => parts[a] - parts[b])[0];
  const out = strong.map((k) => text[k](true));
  if (weakest && parts[weakest] < 60) out.push(`${REASON.minus}: ${text[weakest](false)}`);
  return out.join(' · ');
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

/** Absteigend nach Score; danach höchstens 2 Orte je Land unter den ersten 6 */
export function rankPlaces(scored: Scored[]): Scored[] {
  const sorted = [...scored].sort((a, b) => b.total - a.total || a.place.name.localeCompare(b.place.name));
  const top: Scored[] = [];
  const later: Scored[] = [];
  const perCountry = new Map<string, number>();
  for (const s of sorted) {
    const n = perCountry.get(s.place.countryId) ?? 0;
    if (top.length < DIVERSITY.top && n >= DIVERSITY.perCountry) later.push(s);
    else if (top.length < DIVERSITY.top) {
      top.push(s);
      perCountry.set(s.place.countryId, n + 1);
    } else later.push(s);
  }
  // Nachgerückte behalten ihre Score-Reihenfolge
  later.sort((a, b) => b.total - a.total || a.place.name.localeCompare(b.place.name));
  return [...top, ...later];
}
