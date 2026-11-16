import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { InterestId } from '../data/schema';
import type { TransportKind } from '../domain/transport';
import type { Exclusions, Pace, Party, RegionFilter, Stop, Style, TripDays } from '../domain/types';

export interface TripInputs {
  month: number;
  days: TripDays;
  interests: InterestId[];
  mustHave?: InterestId;
  region: RegionFilter;
  pace: Pace;
  style: Style;
  party: Party;
  exclusions: Exclusions;
}

export interface TripState extends TripInputs {
  stops: Stop[];
  legChoice: Record<string, TransportKind>;

  setInput(patch: Partial<TripInputs>): void;
  toggleInterest(id: InterestId): void;
  addStop(placeId: string): void;
  removeStop(index: number): void;
  moveStop(from: number, to: number): void;
  setNights(index: number, nights: number): void;
  setLeg(key: string, kind: TransportKind): void;
  applyRoute(stops: Stop[]): void;
  loadPlan(plan: { month: number; days: number; stops: Stop[]; legChoice: Record<string, TransportKind> }): void;
  reset(): void;
}

export const DEFAULT_INPUTS: TripInputs = {
  month: new Date().getMonth(),
  days: 14,
  interests: [],
  mustHave: undefined,
  region: 'Alle',
  pace: 'mid',
  style: 'komfort',
  party: 'paar',
  exclusions: { noLongHaul: false, noHeat: false, noMalaria: false },
};

/** localStorage mit try/catch – ohne Speicher (privater Modus) läuft die App mit Standardwerten weiter */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v); } catch { /* kein Speicher – egal */ }
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k); } catch { /* egal */ }
  },
};

const clampNights = (n: number) => Math.max(1, Math.min(21, Math.round(n)));
const DAY_OPTIONS: TripDays[] = [7, 10, 14, 21];
const nearestDays = (d: number): TripDays =>
  DAY_OPTIONS.reduce((best, x) => (Math.abs(x - d) < Math.abs(best - d) ? x : best), 14 as TripDays);

export const useTrip = create<TripState>()(
  persist(
    (set) => ({
      ...DEFAULT_INPUTS,
      stops: [],
      legChoice: {},

      setInput: (patch) => set(patch),
      toggleInterest: (id) =>
        set((s) => {
          const on = s.interests.includes(id);
          if (!on) return { interests: [...s.interests, id] };
          // zweiter Tipp: als „Muss“ markieren (max. eine), dritter Tipp: abwählen
          if (s.mustHave !== id) return { mustHave: id };
          return { interests: s.interests.filter((x) => x !== id), mustHave: undefined };
        }),
      addStop: (placeId) =>
        set((s) => (s.stops.some((x) => x.placeId === placeId) ? s : { stops: [...s.stops, { placeId, nights: 3 }] })),
      removeStop: (index) => set((s) => ({ stops: s.stops.filter((_, i) => i !== index) })),
      moveStop: (from, to) =>
        set((s) => {
          if (to < 0 || to >= s.stops.length) return s;
          const stops = s.stops.slice();
          const [x] = stops.splice(from, 1);
          stops.splice(to, 0, x);
          return { stops };
        }),
      setNights: (index, nights) =>
        set((s) => ({ stops: s.stops.map((x, i) => (i === index ? { ...x, nights: clampNights(nights) } : x)) })),
      setLeg: (key, kind) => set((s) => ({ legChoice: { ...s.legChoice, [key]: kind } })),
      applyRoute: (stops) => set({ stops, legChoice: {} }),
      loadPlan: (plan) =>
        set({ month: plan.month, days: nearestDays(plan.days), stops: plan.stops, legChoice: plan.legChoice }),
      reset: () => set({ ...DEFAULT_INPUTS, stops: [], legChoice: {} }),
    }),
    {
      name: 'reisezeit-trip-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ month, days, interests, mustHave, region, pace, style, party, exclusions, stops, legChoice }) => ({
        month, days, interests, mustHave, region, pace, style, party, exclusions, stops, legChoice,
      }),
      // Bei Änderungen am Datenmodell Version erhöhen; alte Stände werden dann verworfen.
      migrate: () => ({ ...DEFAULT_INPUTS, stops: [], legChoice: {} }) as unknown as TripState,
    },
  ),
);
