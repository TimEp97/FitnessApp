import type { Exercise, ID, MuscleId, Workout } from '../types';
import { MUSCLES } from '../data/labels';
import { addDays, DAY_MS } from './dates';
import { isFinished, setVolume, workSets } from './metrics';

/**
 * Schwellen der Muskelkarte in Arbeitssätzen pro Woche.
 * Arbeitsannahme, keine medizinische Aussage – vor Veröffentlichung fachlich prüfen.
 */
export const LOAD_THRESHOLDS = {
  /** unter diesem Wert: grau, wenig trainiert */
  low: 4,
  /** bis einschließlich: lime, im empfohlenen Bereich */
  okMax: 12,
  /** bis einschließlich: orange, kürzlich stark beansprucht; darüber rot */
  highMax: 18,
};

export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.5;

export type LoadLevel = 'none' | 'ok' | 'high' | 'veryHigh';

export const LOAD_LABEL: Record<LoadLevel, string> = {
  none: 'Wenig trainiert',
  ok: 'Im empfohlenen Bereich',
  high: 'Kürzlich stark beansprucht',
  veryHigh: 'Hohe aktuelle Belastung',
};

export const LOAD_COLOR: Record<LoadLevel, string> = {
  none: 'var(--muscle-none)',
  ok: 'var(--accent)',
  high: 'var(--orange)',
  veryHigh: 'var(--red)',
};

export function loadLevel(weeklySets: number): LoadLevel {
  if (weeklySets < LOAD_THRESHOLDS.low) return 'none';
  if (weeklySets <= LOAD_THRESHOLDS.okMax) return 'ok';
  if (weeklySets <= LOAD_THRESHOLDS.highMax) return 'high';
  return 'veryHigh';
}

export interface MuscleStat {
  /** gewichtete Arbeitssätze im Zeitraum */
  sets: number;
  /** auf eine Woche umgerechnet */
  weekly: number;
  level: LoadLevel;
  /** anteiliges Volumen in kg (sekundär zur Hälfte) */
  volume: number;
  /** letztes Training dieses Muskels über die gesamte Historie */
  lastTrained?: string;
}

function emptyRecord<T>(make: () => T): Record<MuscleId, T> {
  return Object.fromEntries(MUSCLES.map((m) => [m, make()])) as Record<MuscleId, T>;
}

/** Gewichtete Satzzahl je Muskel zwischen `from` (inklusive) und `to` (exklusive). */
export function muscleSets(workouts: Workout[], exById: Map<ID, Exercise>, from: Date, to: Date): Record<MuscleId, { sets: number; volume: number }> {
  const out = emptyRecord(() => ({ sets: 0, volume: 0 }));
  const a = from.getTime();
  const b = to.getTime();
  for (const w of workouts) {
    if (!isFinished(w)) continue;
    const t = new Date(w.startedAt).getTime();
    if (t < a || t >= b) continue;
    for (const e of w.entries) {
      const ex = exById.get(e.exerciseId);
      if (!ex) continue;
      const ws = workSets(e.sets);
      if (!ws.length) continue;
      const vol = ws.reduce((s, x) => s + setVolume(x), 0);
      for (const m of ex.primary) {
        out[m].sets += ws.length * PRIMARY_WEIGHT;
        out[m].volume += vol * PRIMARY_WEIGHT;
      }
      for (const m of ex.secondary) {
        if (ex.primary.includes(m)) continue;
        out[m].sets += ws.length * SECONDARY_WEIGHT;
        out[m].volume += vol * SECONDARY_WEIGHT;
      }
    }
  }
  return out;
}

export function lastTrainedByMuscle(workouts: Workout[], exById: Map<ID, Exercise>): Partial<Record<MuscleId, string>> {
  const out: Partial<Record<MuscleId, string>> = {};
  for (const w of workouts) {
    if (!isFinished(w)) continue;
    for (const e of w.entries) {
      const ex = exById.get(e.exerciseId);
      if (!ex || !workSets(e.sets).length) continue;
      for (const m of [...ex.primary, ...ex.secondary]) {
        const cur = out[m];
        if (!cur || cur < w.startedAt) out[m] = w.startedAt;
      }
    }
  }
  return out;
}

/** Belastung je Muskel für die letzten `days` Tage. Bei 30 und 90 Tagen wird auf einen Wochenschnitt umgerechnet. */
export function muscleLoad(workouts: Workout[], exById: Map<ID, Exercise>, days: number, now: Date = new Date()): Record<MuscleId, MuscleStat> {
  const from = new Date(now.getTime() - days * DAY_MS);
  const to = new Date(now.getTime() + 1);
  const counts = muscleSets(workouts, exById, from, to);
  const last = lastTrainedByMuscle(workouts, exById);
  const out = {} as Record<MuscleId, MuscleStat>;
  for (const m of MUSCLES) {
    const weekly = (counts[m].sets * 7) / days;
    out[m] = { sets: counts[m].sets, weekly, level: loadLevel(weekly), volume: counts[m].volume, lastTrained: last[m] };
  }
  return out;
}

/** Gewichtete Sätze eines Muskels je Kalenderwoche, älteste zuerst. */
export function muscleWeeklyHistory(workouts: Workout[], exById: Map<ID, Exercise>, muscle: MuscleId, weeks: number, weekStart: Date): number[] {
  const out: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addDays(weekStart, -7 * i);
    out.push(muscleSets(workouts, exById, from, addDays(from, 7))[muscle].sets);
  }
  return out;
}
