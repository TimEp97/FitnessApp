import { describe, expect, it } from 'vitest';
import realCountries from '../data/countries.json';
import realPlaces from '../data/places.json';
import type { Country, Place } from '../data/schema';
import { aggregate, ranges } from './climate';
import { makeCtx } from './ctx';
import { passesFilters, filterPlaces } from './filter';
import { baseInputs, fxCountries, fxPlaces } from './fixtures';
import { km } from './geo';
import { decodePlan, encodePlan } from './planLink';
import { buildRoute, radiusFor } from './route';
import { rankPlaces, scorePlace } from './score';
import { suggest } from './suggest';
import { buildPlan } from './timeline';
import { transportOptions } from './transport';
import type { Inputs, Scored } from './types';

const ctx = makeCtx(fxCountries, fxPlaces);
const P = (id: string) => ctx.place(id)!;

describe('ranges()', () => {
  it('fasst Monate zu Bereichen zusammen, auch über den Jahreswechsel', () => {
    expect(ranges('GGLYYYYYRRGG', 'G')).toBe('Nov–Feb');
    expect(ranges('LLLGGGGGGGLL', 'L')).toBe('Nov–Mär');
    expect(ranges('RRRRRGGGGRRR', 'G')).toBe('Jun–Sep');
    expect(ranges('GGGGGGGGGGGG', 'G')).toBe('ganzjährig');
    expect(ranges('GGGGGGGGGGGG', 'R')).toBe('–');
    expect(ranges('GLGLLLLLLLLL', 'G')).toBe('Jan, Mär');
  });
});

describe('aggregate()', () => {
  it('Thailand hat in jedem Monat mindestens L – außer September (überall Regen)', () => {
    const th = fxCountries.find((c) => c.id === 'th')!;
    const agg = aggregate(th.regions.map((r) => r.climate));
    expect(agg).toBe('GGGGLLLLYLGG');
    [...agg].forEach((c, m) => {
      if (m === 8) expect(c).toBe('Y');
      else expect(['G', 'L']).toContain(c);
    });
  });
});

describe('Filter', () => {
  it('Koh Lanta fällt im Juli raus (Regenzeit)', () => {
    expect(passesFilters(P('lnt'), { ...baseInputs, month: 6, interests: ['strand'] }, ctx)).toEqual({ ok: false, reason: 'Regenzeit' });
  });
  it('Uyuni bleibt im Februar wegen des Spiegeleffekts', () => {
    expect(passesFilters(P('uyu'), { ...baseInputs, month: 1, days: 21, interests: ['natur'] }, ctx).ok).toBe(true);
    expect(passesFilters(P('uyu'), { ...baseInputs, month: 0, days: 21, interests: ['natur'] }, ctx).reason).toBe('Regenzeit');
  });
  it('Muss-Vorliebe, Langstrecke und zu lange Anreise', () => {
    const inp: Inputs = { ...baseInputs, interests: ['strand', 'kultur'], mustHave: 'kultur' };
    expect(passesFilters(P('lnt'), inp, ctx).reason).toBe('Muss fehlt');
    expect(passesFilters(P('bkk'), { ...inp, exclusions: { ...inp.exclusions, noLongHaul: true } }, ctx).reason).toBe('Langstrecke');
    expect(passesFilters(P('uyu'), { ...baseInputs, month: 5, days: 7, interests: ['natur'] }, ctx).reason).toBe('Anreise zu lang');
  });
  it('lockert die Region bei zu wenig Treffern, aber nie die Regenzeit', () => {
    const r = filterPlaces({ ...baseInputs, region: 'Afrika', interests: ['strand'] }, ctx);
    expect(r.relaxed.map((x) => x.kind)).toEqual(['region']);
    expect(r.places.length).toBeGreaterThanOrEqual(3);
    const july = filterPlaces({ ...baseInputs, month: 6, interests: ['strand'] }, ctx);
    expect(july.places.map((p) => p.id)).not.toContain('lnt');
  });
});

describe('Score', () => {
  it('Beispiel 1: Paar, März, 14 Tage, Komfort → Koh Lanta 84', () => {
    const s = scorePlace(P('lnt'), { ...baseInputs, party: 'paar', interests: ['strand', 'ruhe', 'stays'] }, ctx);
    expect(s.total).toBe(84);
    expect({ ...s.parts, P: Math.round(s.parts.P) }).toEqual({ W: 100, P: 88, A: 60, B: 100, F: 50, E: 0 });
    expect(s.reasons).toContain('passt zu');
    expect(s.reasons).toContain('Minus: 14 h Anreise');
  });
  it('Beispiel 2: Solo, Juli, 10 Tage, Budget, Europa → Bled 87, Färöer 81, Dolomiten 77', () => {
    const inp: Inputs = { ...baseInputs, month: 6, days: 10, style: 'budget', region: 'Europa', interests: ['berge', 'natur', 'abenteuer'] };
    const r = suggest(inp, ctx).ranked.map((s) => [s.place.id, s.total]);
    expect(r).toEqual([['bled', 87], ['fae', 81], ['dol', 77]]);
  });
  it('Familie gewichtet Anreise stärker und ignoriert Nachtleben', () => {
    const fam = scorePlace(P('bkk'), { ...baseInputs, party: 'familie', interests: ['kultur', 'nightlife'] }, ctx);
    expect(fam.parts.P).toBe(100);
  });
  it('Vielfalt: höchstens 2 Orte je Land in den Top 6', () => {
    const many: Scored[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id, i) => ({
      place: { ...P('lnt'), id, name: id, countryId: i < 5 ? 'th' : `x${i}` },
      total: 90 - i, parts: { W: 0, P: 0, A: 0, B: 0, F: 0, E: 0 }, reasons: '',
    }));
    const top6 = rankPlaces(many).slice(0, 6);
    const perCountry = top6.reduce<Record<string, number>>((m, s) => ({ ...m, [s.place.countryId]: (m[s.place.countryId] ?? 0) + 1 }), {});
    expect(Math.max(...Object.values(perCountry))).toBeLessThanOrEqual(2);
  });
});

describe('Route', () => {
  it('14 Tage, ausgewogen → 4 Stopps, 13 Nächte, alle im 900-km-Umkreis', () => {
    const inp: Inputs = { ...baseInputs, region: 'Südostasien', interests: ['strand', 'kultur', 'food'] };
    const { ranked } = suggest(inp, ctx);
    const stops = buildRoute(ranked, inp, ctx);
    expect(stops).toHaveLength(4);
    expect(stops.reduce((s, x) => s + x.nights, 0)).toBe(13);
    const places = stops.map((s) => P(s.placeId));
    const radius = radiusFor(places[0], ctx);
    expect(radius).toBe(900);
    for (const p of places) expect(places.some((q) => q !== p && km(p, q) <= radius)).toBe(true);
    // Start an einem internationalen Flughafen
    expect(places[0].transport.intlAirport).toBe(true);
    // jede Vorliebe mindestens einmal mit Stärke 3
    for (const id of inp.interests) expect(places.some((p) => (p.interests[id] ?? 0) >= 3)).toBe(true);
  });
  it('Städte höchstens 3 Nächte, Strand am Ende mindestens 4', () => {
    const inp: Inputs = { ...baseInputs, days: 21, pace: 'slow', region: 'Südostasien', interests: ['strand', 'kultur'] };
    const stops = buildRoute(suggest(inp, ctx).ranked, inp, ctx);
    expect(stops.reduce((s, x) => s + x.nights, 0)).toBe(20);
    const bkk = stops.find((s) => s.placeId === 'bkk');
    if (bkk) expect(bkk.nights).toBeLessThanOrEqual(3);
    const last = P(stops[stops.length - 1].placeId);
    if ((last.interests.strand ?? 0) >= 3) expect(stops[stops.length - 1].nights).toBeGreaterThanOrEqual(4);
  });
});

describe('Verkehr', () => {
  const opts = (a: string, b: string) =>
    transportOptions({ place: P(a), area: ctx.area(P(a)) }, { place: P(b), area: ctx.area(P(b)) }, 'komfort');
  it('Galápagos ↔ Quito: nur Flug', () => {
    expect(opts('gps', 'uio').options.map((o) => o.kind)).toEqual(['flug']);
  });
  it('Bangkok ↔ Chiang Mai: Flug, Nachtzug, Nachtbus', () => {
    const o = opts('bkk', 'cnx');
    expect(o.options.map((x) => x.label)).toEqual(['Flug', 'Nachtzug', 'Nachtbus']);
    expect(o.recommended).toBe('flug');
  });
  it('Bangkok ↔ Ayutthaya: Bodenverbindung empfohlen', () => {
    expect(opts('bkk', 'ayu').recommended).not.toBe('flug');
  });
  it('Insel ohne Flughafen in Reichweite: Fähre', () => {
    expect(opts('usm', 'tao').options.map((x) => x.kind)).toEqual(['faehre']);
  });
});

describe('Tagesablauf', () => {
  it('Reisetage zählen zum Ankunftsort', () => {
    const plan = buildPlan([{ placeId: 'bkk', nights: 3 }, { placeId: 'cnx', nights: 3 }], {}, 'komfort', 2, ctx);
    const items = plan.items.map((i) => (i.type === 'stop' ? `S${i.fromDay}-${i.toDay}` : i.type === 'leg' ? `L${i.day}` : `R${i.day}`));
    expect(items).toEqual(['S1-3', 'L4', 'S4-6', 'R7']);
    expect(plan.totalDays).toBe(7);
  });
  it('warnt bei Regenzeit und Schließung', () => {
    const plan = buildPlan([{ placeId: 'lnt', nights: 4 }], {}, 'komfort', 6, ctx);
    expect(plan.warnings).toHaveLength(2);
  });
});

describe('Plan-Link', () => {
  it('kodieren → dekodieren ergibt denselben Plan', () => {
    const plan = {
      month: 2, days: 14,
      stops: [{ placeId: 'bkk', nights: 3 }, { placeId: 'cnx', nights: 3 }, { placeId: 'kbv', nights: 3 }, { placeId: 'lnt', nights: 4 }],
      legChoice: { 'bkk>cnx': 'zug', 'cnx>kbv': 'flug', 'kbv>lnt': 'faehre' } as const,
    };
    const code = encodePlan(plan);
    expect(code).toBe('m2.d14.bkk3-cnx3-kbv3-lnt4.z-f-s');
    expect(decodePlan(code)).toEqual(plan);
  });
  it('lehnt kaputte Links ab', () => {
    expect(decodePlan('quatsch')).toBeNull();
    expect(decodePlan('m14.d7.bkk3')).toBeNull();
  });
});

describe('Echte Daten', () => {
  const real = makeCtx(realCountries as Country[], realPlaces as Place[]);
  it('liefert für jeden Monat Vorschläge und baut eine Route', () => {
    for (let month = 0; month < 12; month++) {
      const inp: Inputs = { ...baseInputs, month, interests: ['strand', 'kultur', 'natur'] };
      const { ranked } = suggest(inp, real);
      expect(ranked.length).toBeGreaterThan(3);
      const stops = buildRoute(ranked, inp, real);
      expect(stops.length).toBeGreaterThanOrEqual(2);
      expect(stops.length).toBeLessThanOrEqual(6);
      expect(stops.reduce((s, x) => s + x.nights, 0)).toBe(13);
    }
  });
});
