import type { Place } from '../data/schema';
import { FILTER } from './config';
import { codeAt } from './climate';
import { matchScore } from './score';
import type { Ctx, Exclusions, Inputs, RegionFilter } from './types';

export type FilterReason =
  | 'Reisewarnung' | 'Region' | 'Regenzeit' | 'geschlossen' | 'keine Vorliebe'
  | 'Muss fehlt' | 'Langstrecke' | 'Malaria' | 'Hitze' | 'Anreise zu lang';

export interface FilterResult { ok: boolean; reason?: FilterReason }

const no = (reason: FilterReason): FilterResult => ({ ok: false, reason });

export function regionMatches(p: Place, region: RegionFilter, ctx: Ctx): boolean {
  if (region === 'Alle') return true;
  const area = ctx.area(p);
  if (region === 'Afrika') return area === 'Afrika';
  return area === region;
}

export function passesFilters(p: Place, inp: Inputs, ctx: Ctx): FilterResult {
  const code = codeAt(ctx.climate(p), inp.month);
  const rainEvent = p.events?.some((e) => e.month === inp.month && e.overridesRain);
  if (p.safety > 0) return no('Reisewarnung');
  if (!regionMatches(p, inp.region, ctx)) return no('Region');
  if (code === 'R' && !rainEvent) return no('Regenzeit');
  if (p.closedMonths?.includes(inp.month)) return no('geschlossen');
  if (inp.interests.length && matchScore(p, inp) === 0) return no('keine Vorliebe');
  if (inp.mustHave && (p.interests[inp.mustHave] ?? 0) < FILTER.mustHaveMinStrength) return no('Muss fehlt');
  if (inp.exclusions.noLongHaul && p.flightHoursFromDE > FILTER.longHaulHours) return no('Langstrecke');
  if (inp.exclusions.noMalaria && p.malaria) return no('Malaria');
  if (inp.exclusions.noHeat && (p.maxTempC?.[inp.month] ?? 0) > FILTER.heatC) return no('Hitze');
  if (2 * p.flightHoursFromDE > FILTER.maxTravelShare * inp.days * 24) return no('Anreise zu lang');
  return { ok: true };
}

export interface Relaxation { kind: 'region' | keyof Exclusions; text: string }

const RELAX_TEXT: Record<Relaxation['kind'], string> = {
  region: 'Zu wenige Treffer in der gewählten Region – wir zeigen Orte aus allen Regionen.',
  noLongHaul: 'Zu wenige Treffer ohne Langstrecke – Langstreckenziele sind wieder dabei.',
  noHeat: 'Zu wenige Treffer ohne Hitze – auch heiße Orte sind wieder dabei.',
  noMalaria: 'Zu wenige Treffer ohne Malaria-Gebiete – diese Orte sind wieder dabei.',
};

/**
 * Filtert alle Orte. Bleiben weniger als 3, wird gelockert: (1) Region auf „Alle“,
 * (2) Ausschlüsse einzeln aufheben. Reisewarnungen und Regenzeit werden nie gelockert.
 */
export function filterPlaces(inp: Inputs, ctx: Ctx): { places: Place[]; inputs: Inputs; relaxed: Relaxation[] } {
  let cur = inp;
  const relaxed: Relaxation[] = [];
  const run = () => ctx.places.filter((p) => passesFilters(p, cur, ctx).ok);
  let out = run();
  if (out.length < FILTER.minResults && cur.region !== 'Alle') {
    cur = { ...cur, region: 'Alle' };
    relaxed.push({ kind: 'region', text: RELAX_TEXT.region });
    out = run();
  }
  for (const key of ['noLongHaul', 'noHeat', 'noMalaria'] as const) {
    if (out.length >= FILTER.minResults) break;
    if (!cur.exclusions[key]) continue;
    cur = { ...cur, exclusions: { ...cur.exclusions, [key]: false } };
    relaxed.push({ kind: key, text: RELAX_TEXT[key] });
    out = run();
  }
  return { places: out, inputs: cur, relaxed };
}
