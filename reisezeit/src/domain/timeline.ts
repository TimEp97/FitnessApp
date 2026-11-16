import type { ClimateCode, Place } from '../data/schema';
import { CODE_LABEL, MONTHS_FULL } from '../i18n/de';
import { codeAt } from './climate';
import { chosenOption, legKey, transportOptions, type LegInfo, type TransportKind, type TransportOption } from './transport';
import type { Ctx, Stop, Style } from './types';

export interface Leg {
  key: string;
  from: Place;
  to: Place;
  info: LegInfo;
  chosen: TransportOption;
}

export type TimelineItem =
  | { type: 'stop'; index: number; place: Place; nights: number; fromDay: number; toDay: number; code: ClimateCode }
  | { type: 'leg'; day: number; leg: Leg }
  | { type: 'return'; day: number; place: Place };

export interface Plan {
  places: Place[];
  legs: Leg[];
  items: TimelineItem[];
  totalNights: number;
  totalDays: number;
  transitHours: number;
  countries: string[];
  warnings: string[];
}

export function buildLegs(places: Place[], legChoice: Record<string, TransportKind>, style: Style, ctx: Ctx): Leg[] {
  return places.slice(1).map((to, i) => {
    const from = places[i];
    const key = legKey(from.id, to.id);
    const info = transportOptions({ place: from, area: ctx.area(from) }, { place: to, area: ctx.area(to) }, style);
    return { key, from, to, info, chosen: chosenOption(info, legChoice[key]) };
  });
}

/**
 * Flache Liste: Stopp („Tag 1–3“) → Strecke („Tag 4“) → … → Rückreise.
 * Reisetage zählen zum Ankunftsort.
 */
export function buildPlan(
  stops: Stop[],
  legChoice: Record<string, TransportKind>,
  style: Style,
  month: number,
  ctx: Ctx,
): Plan {
  const valid = stops.filter((s) => ctx.place(s.placeId));
  const places = valid.map((s) => ctx.place(s.placeId)!);
  const legs = buildLegs(places, legChoice, style, ctx);
  const items: TimelineItem[] = [];
  let day = 1;
  valid.forEach((s, i) => {
    const place = places[i];
    if (i > 0) items.push({ type: 'leg', day, leg: legs[i - 1] });
    items.push({
      type: 'stop', index: i, place, nights: s.nights, fromDay: day,
      toDay: day + Math.max(s.nights, 1) - 1, code: codeAt(ctx.climate(place), month),
    });
    day += s.nights;
  });
  if (places.length) items.push({ type: 'return', day, place: places[places.length - 1] });

  const totalNights = valid.reduce((s, x) => s + x.nights, 0);
  const countries = [...new Set(places.map((p) => ctx.country(p).name))];
  return {
    places, legs, items, totalNights,
    totalDays: places.length ? totalNights + 1 : 0,
    transitHours: legs.reduce((s, l) => s + l.chosen.hours, 0),
    countries,
    warnings: warningsFor(places, month, ctx),
  };
}

export function warningsFor(places: Place[], month: number, ctx: Ctx): string[] {
  const out: string[] = [];
  for (const p of places) {
    const code = codeAt(ctx.climate(p), month);
    if (code === 'R' && !p.events?.some((e) => e.month === month && e.overridesRain)) {
      out.push(`${p.name}: Im ${MONTHS_FULL[month]} ${CODE_LABEL.R.toLowerCase()} – Regenzeit, Monsun oder extreme Hitze.`);
    }
    if (p.closedMonths?.includes(month)) {
      out.push(`${p.name}: Im ${MONTHS_FULL[month]} sind viele Unterkünfte und Touren saisonal geschlossen.`);
    }
  }
  return out;
}

export function dayLabel(from: number, to: number): string {
  return from === to ? `Tag ${from}` : `Tag ${from}–${to}`;
}

export const nightsLabel = (n: number) => `${n} ${n === 1 ? 'Nacht' : 'Nächte'}`;

/** Titel wie „Bangkok bis Koh Lanta“ */
export function routeTitle(places: Place[]): string {
  if (!places.length) return 'Neue Reise';
  if (places.length === 1) return places[0].name;
  return `${places[0].name} bis ${places[places.length - 1].name}`;
}
