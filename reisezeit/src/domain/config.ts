// Alle Gewichte, Punktetabellen und Schwellen des Algorithmus an einer Stelle.
// Werte hier ändern, ohne im übrigen Code suchen zu müssen.
import type { ClimateCode } from '../data/schema';
import type { Party, Pace, Style } from './types';

export interface Weights { W: number; P: number; A: number; B: number; F: number; E: number }

export const DEFAULT_WEIGHTS: Weights = { W: 0.35, P: 0.35, A: 0.1, B: 0.1, F: 0.05, E: 0.05 };

/** Familie: Anreise wichtiger, Andrang egal */
export const PARTY_WEIGHTS: Partial<Record<Party, Weights>> = {
  familie: { W: 0.35, P: 0.35, A: 0, B: 0.1, F: 0.15, E: 0.05 },
};

export const W_PTS: Record<ClimateCode, number> = { G: 100, L: 85, Y: 45, R: 0 };
/** Andrang 0–3 */
export const A_PTS = [100, 85, 60, 40];

/** Preisniveau gewünscht je Reisestil */
export const STYLE_PRICE: Record<Style, 1 | 2 | 3> = { budget: 1, komfort: 2, luxus: 3 };
/** passt 100 · eine Stufe teurer 60 · zwei Stufen teurer 20 · günstiger 80 */
export const BUDGET_PTS = { match: 100, pricier: [60, 20], cheaper: 80 };

/** Anreise-Punkte: Zeilen = Flugzeit-Grenzen, Spalten = 1 Woche / 2 Wochen / 3 Wochen */
export const FLIGHT_PTS: { maxHours: number; pts: [number, number, number] }[] = [
  { maxHours: 4, pts: [100, 100, 100] },
  { maxHours: 8, pts: [60, 90, 100] },
  { maxHours: 12, pts: [20, 70, 90] },
  { maxHours: Infinity, pts: [0, 50, 80] },
];
export const flightColumn = (days: number) => (days <= 9 ? 0 : days <= 17 ? 1 : 2);

/** Matching: Muss-Vorliebe zählt doppelt, Paare gewichten Ruhe/Unterkünfte 1,5-fach */
export const MUST_WEIGHT = 2;
export const COUPLE_BOOST = 1.5;

/** Filter */
export const FILTER = {
  longHaulHours: 8,
  heatC: 35,
  /** Hin- und Rückflug dürfen höchstens diesen Anteil der Reisezeit fressen */
  maxTravelShare: 0.2,
  minResults: 3,
  mustHaveMinStrength: 2,
};

/** Routenbau */
export const NIGHTS_PER_STOP: Record<Pace, number> = { slow: 4, mid: 3, fast: 2 };
export const ROUTE = {
  minStops: 2,
  maxStops: 6,
  radiusKm: { Europa: 600, default: 900 },
  /** so viele der besten Orte werden als Startpunkt (Anker) probiert */
  anchorTries: 12,
  /** Strand-/Ruhe-Ort ans Ende, wenn der Weg höchstens so viel länger wird */
  beachEndDetour: 1.2,
  cityMaxNights: 3,
  beachEndMinNights: 4,
  /** Zeit unterwegs höchstens dieser Anteil der wachen Stunden */
  maxTransitShare: 0.15,
  wakeHoursPerDay: 16,
  maxNights: 21,
};

/** Rangliste: höchstens so viele Orte je Land unter den ersten N */
export const DIVERSITY = { top: 6, perCountry: 2 };

/** Verkehrsmittel – Geschwindigkeiten in km/h, Straßenfaktor auf die Luftlinie */
export const TRANSPORT = {
  roadFactor: 1.3,
  flight: { speed: 700, overhead: 2.5, overheadTransfer: 4, minKm: 200 },
  train: { speedEurope: 80, speed: 55, nightAfter: 8 },
  ferry: { speed: 40, overhead: 1.5, maxKm: 400 },
  bus: { speed: 50, overhead: 0.5, nightAfter: 8 },
  car: { speed: 65, maxKm: 450 },
  recommend: { groundMax: 7, budgetGroundMax: 10, luxusPrivateMax: 5 },
};
