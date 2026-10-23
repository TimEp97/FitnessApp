import type { Exercise, MuscleId, SetLog, Workout } from '../types';

let n = 0;
const id = () => `id-${++n}`;

export function set(weight: number, reps: number, kind: SetLog['kind'] = 'work'): SetLog {
  return { id: id(), kind, weight, reps, doneAt: '2026-01-01T00:00:00.000Z' };
}

export function workout(date: string, entries: { ex: string; sets: SetLog[] }[], extra: Partial<Workout> = {}): Workout {
  const start = new Date(date);
  return {
    id: id(),
    name: 'Test',
    startedAt: start.toISOString(),
    finishedAt: new Date(start.getTime() + 60 * 60000).toISOString(),
    pausedMs: 0,
    entries: entries.map((e) => ({ exerciseId: e.ex, sets: e.sets })),
    ...extra,
  };
}

export function exercise(idValue: string, primary: MuscleId[], secondary: MuscleId[] = [], extra: Partial<Exercise> = {}): Exercise {
  return {
    id: idValue,
    name: idValue,
    equipment: 'barbell',
    level: 'beginner',
    primary,
    secondary,
    steps: [],
    breathing: '',
    mistakes: [],
    recommended: { sets: [3, 4], reps: [8, 12] },
    weightStep: 2.5,
    custom: false,
    ...extra,
  };
}
