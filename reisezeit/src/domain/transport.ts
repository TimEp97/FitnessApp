import type { Place } from '../data/schema';
import { TRANSPORT as T } from './config';
import { km } from './geo';
import type { Area, Style } from './types';

export type TransportKind = 'flug' | 'zug' | 'bus' | 'faehre' | 'auto';
export const TRANSPORT_KINDS: TransportKind[] = ['flug', 'zug', 'bus', 'faehre', 'auto'];

export interface TransportOption {
  kind: TransportKind;
  label: string;
  hours: number;
  note: string;
  recommended: boolean;
}

export interface LegInfo {
  km: number;
  options: TransportOption[];
  recommended: TransportKind;
}

interface Endpoint { place: Place; area: Area }

/** Verkehrsmittel-Optionen für eine Strecke, geschätzt aus der Luftlinie */
export function transportOptions(a: Endpoint, b: Endpoint, style: Style): LegInfo {
  const d = km(a.place, b.place);
  const g = d * T.roadFactor;
  const ta = a.place.transport;
  const tb = b.place.transport;
  const europe = a.area === 'Europa' && b.area === 'Europa';
  const island = ta.island || tb.island;
  const sameCountry = a.place.countryId === b.place.countryId;
  const opts: Omit<TransportOption, 'recommended'>[] = [];

  if (ta.airport && tb.airport && d > T.flight.minKm) {
    opts.push({ kind: 'flug', label: 'Flug', hours: d / T.flight.speed + T.flight.overhead, note: 'inkl. Weg zum Flughafen und Check-in' });
  }
  if (ta.rail && tb.rail && !island && (sameCountry || europe)) {
    const h = g / (europe ? T.train.speedEurope : T.train.speed);
    const night = h > T.train.nightAfter;
    opts.push({ kind: 'zug', label: night ? 'Nachtzug' : 'Zug', hours: h, note: night ? 'Schlafwagen spart eine Hotelnacht' : 'bequem und entspannt' });
  }
  if (island) {
    if (d < T.ferry.maxKm) {
      opts.push({
        kind: 'faehre',
        label: ta.island && tb.island ? 'Fähre' : 'Bus + Fähre',
        hours: g / T.ferry.speed + T.ferry.overhead,
        note: 'Fähren rechtzeitig buchen, bei Sturm fallen sie aus',
      });
    }
  } else {
    const h = g / T.bus.speed + T.bus.overhead;
    opts.push({ kind: 'bus', label: h > T.bus.nightAfter ? 'Nachtbus' : 'Bus / Minivan', hours: h, note: 'günstigste Variante' });
    if (g < T.car.maxKm) {
      const sea = a.area === 'Südostasien' || a.area === 'Asien';
      opts.push({ kind: 'auto', label: sea ? 'Privatfahrer' : 'Mietwagen', hours: g / T.car.speed, note: 'flexibel, mit Fotostopps' });
    }
  }
  if (!opts.length) {
    opts.push({ kind: 'flug', label: 'Flug mit Umstieg', hours: d / T.flight.speed + T.flight.overheadTransfer, note: 'keine direkte Land- oder Fährverbindung' });
  }

  const rec = recommend(opts, style);
  return { km: d, options: opts.map((o) => ({ ...o, recommended: o.kind === rec })), recommended: rec };
}

/** Schnellste Bodenverbindung bis 7 h, sonst Flug. Budget: Bus/Bahn bis 10 h. Luxus: Privattransfer bis 5 h. */
function recommend(opts: Omit<TransportOption, 'recommended'>[], style: Style): TransportKind {
  const flight = opts.find((o) => o.kind === 'flug');
  const ground = opts.filter((o) => o.kind !== 'flug').sort((x, y) => x.hours - y.hours);
  const fastestGround = ground[0];
  const fallback = flight?.kind ?? fastestGround.kind;

  if (style === 'budget') {
    const cheap = ground.filter((o) => o.kind === 'bus' || o.kind === 'zug' || o.kind === 'faehre');
    const pick = cheap.find((o) => o.hours <= T.recommend.budgetGroundMax);
    if (pick) return pick.kind;
    return fallback;
  }
  if (style === 'luxus') {
    const car = ground.find((o) => o.kind === 'auto' && o.hours <= T.recommend.luxusPrivateMax);
    if (car) return car.kind;
  }
  if (fastestGround && fastestGround.hours <= T.recommend.groundMax) return fastestGround.kind;
  return fallback;
}

export const legKey = (a: string, b: string) => `${a}>${b}`;

/** Gewähltes Verkehrsmittel einer Strecke: Nutzerwahl, falls noch möglich, sonst Empfehlung */
export function chosenOption(info: LegInfo, choice?: TransportKind): TransportOption {
  return info.options.find((o) => o.kind === choice) ?? info.options.find((o) => o.recommended)!;
}

export function formatHours(h: number): string {
  if (h < 1) return 'unter 1 h';
  const r = Math.round(h * 2) / 2;
  return `ca. ${String(r).replace('.', ',')} h`;
}
