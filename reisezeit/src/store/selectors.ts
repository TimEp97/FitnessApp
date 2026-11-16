import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ctx } from '../data';
import { buildPlan } from '../domain/timeline';
import type { Inputs } from '../domain/types';
import { useTrip } from './tripStore';

/** Eingaben für den Algorithmus aus dem Store */
export function useInputs(): Inputs {
  return useTrip(
    useShallow((s) => ({
      month: s.month, days: s.days, interests: s.interests, mustHave: s.mustHave, region: s.region,
      pace: s.pace, style: s.style, party: s.party, exclusions: s.exclusions,
    })),
  );
}

/** Abgeleiteter Reiseplan (nicht gespeichert, sondern immer neu berechnet) */
export function usePlan() {
  const { stops, legChoice, style, month } = useTrip(
    useShallow((s) => ({ stops: s.stops, legChoice: s.legChoice, style: s.style, month: s.month })),
  );
  return useMemo(() => buildPlan(stops, legChoice, style, month, ctx), [stops, legChoice, style, month]);
}
