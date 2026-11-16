// Plan als kompakter Text für den Teilen-Link, z. B. "m2.d14.bkk3-cnx3-kbv3-lnt4.z-f-s"
// m = Monat (0–11), d = Reisetage, dann Stopps mit Nächten, dann Verkehrsmittel je Strecke.
import { legKey, type TransportKind } from './transport';
import type { Stop } from './types';

const KIND_CODE: Record<TransportKind, string> = { flug: 'f', zug: 'z', bus: 'b', faehre: 's', auto: 'a' };
const CODE_KIND = Object.fromEntries(Object.entries(KIND_CODE).map(([k, v]) => [v, k])) as Record<string, TransportKind>;

export interface SharedPlan {
  month: number;
  days: number;
  stops: Stop[];
  legChoice: Record<string, TransportKind>;
}

export function encodePlan(plan: SharedPlan): string {
  const stops = plan.stops.map((s) => `${s.placeId}${s.nights}`).join('-');
  const legs = plan.stops
    .slice(1)
    .map((s, i) => {
      const k = plan.legChoice[legKey(plan.stops[i].placeId, s.placeId)];
      return k ? KIND_CODE[k] : '_';
    })
    .join('-');
  return [`m${plan.month}`, `d${plan.days}`, stops, legs].filter(Boolean).join('.');
}

export function decodePlan(code: string, knownPlace?: (id: string) => boolean): SharedPlan | null {
  const parts = decodeURIComponent(code).split('.');
  if (parts.length < 3) return null;
  const month = Number(parts[0].match(/^m(\d{1,2})$/)?.[1]);
  const days = Number(parts[1].match(/^d(\d{1,2})$/)?.[1]);
  if (!(month >= 0 && month <= 11) || !(days >= 1 && days <= 60)) return null;
  const stops: Stop[] = [];
  for (const tok of parts[2].split('-')) {
    const m = tok.match(/^([a-z]+)(\d{1,2})$/);
    if (!m) return null;
    if (knownPlace && !knownPlace(m[1])) continue;
    stops.push({ placeId: m[1], nights: Math.max(1, Math.min(21, Number(m[2]))) });
  }
  if (!stops.length) return null;
  const legChoice: Record<string, TransportKind> = {};
  (parts[3]?.split('-') ?? []).forEach((c, i) => {
    const kind = CODE_KIND[c];
    if (kind && stops[i + 1]) legChoice[legKey(stops[i].placeId, stops[i + 1].placeId)] = kind;
  });
  return { month, days, stops, legChoice };
}
