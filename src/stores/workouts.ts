import { create } from 'zustand';
import type { ID, Plan, PlanDay, SetLog, Workout, WorkoutEntry } from '../types';
import { db } from '../db/db';
import { uid } from '../logic/dates';
import { moveItem } from '../logic/planning';
import { sortByStart } from '../logic/metrics';

interface WorkoutState {
  /** abgeschlossene Workouts, älteste zuerst */
  workouts: Workout[];
  /** laufendes Workout */
  active: Workout | null;
  setAll: (list: Workout[]) => void;

  start: (opts: { plan?: Plan; day?: PlanDay; name?: string }) => Promise<Workout>;
  completeSet: (entryIndex: number, weight: number, reps: number, restSeconds: number) => Promise<void>;
  updateSet: (entryIndex: number, setId: ID, patch: Partial<Pick<SetLog, 'weight' | 'reps' | 'kind'>>) => Promise<void>;
  deleteSet: (entryIndex: number, setId: ID) => Promise<void>;
  goTo: (index: number) => Promise<void>;
  addExercise: (exerciseId: ID) => Promise<void>;
  removeEntry: (index: number) => Promise<void>;
  moveEntry: (from: number, to: number) => Promise<void>;
  setEntryNote: (index: number, note: string) => Promise<void>;
  togglePause: () => Promise<void>;
  addRest: (seconds: number) => Promise<void>;
  skipRest: () => Promise<void>;
  /** Liefert die ID des gespeicherten Workouts oder null, wenn ohne Sätze verworfen. */
  finish: () => Promise<ID | null>;
  discard: () => Promise<void>;
  deleteWorkout: (id: ID) => Promise<void>;
}

export const useWorkouts = create<WorkoutState>((set, get) => {
  /** Ändert das laufende Workout und speichert es sofort. */
  const mutate = async (fn: (w: Workout) => Workout) => {
    const cur = get().active;
    if (!cur) return;
    const next = fn(cur);
    set({ active: next });
    await db.workouts.put(next);
  };
  const mapEntry = (w: Workout, index: number, fn: (e: WorkoutEntry) => WorkoutEntry): Workout => ({
    ...w,
    entries: w.entries.map((e, i) => (i === index ? fn(e) : e)),
  });
  const cursor = (w: Workout) => w.cursor ?? { index: 0 };

  return {
    workouts: [],
    active: null,
    setAll: (list) =>
      set({
        workouts: sortByStart(list.filter((w) => w.finishedAt)),
        active: list.find((w) => !w.finishedAt) ?? null,
      }),

    start: async ({ plan, day, name }) => {
      const w: Workout = {
        id: uid(),
        planId: plan?.id,
        planDayId: day?.id,
        name: name ?? day?.name ?? 'Freies Training',
        startedAt: new Date().toISOString(),
        pausedMs: 0,
        entries: (day?.items ?? []).map((i) => ({ exerciseId: i.exerciseId, target: { sets: i.sets, reps: [...i.reps] as [number, number] }, sets: [] })),
        cursor: { index: 0 },
      };
      set({ active: w });
      await db.workouts.put(w);
      return w;
    },

    completeSet: (entryIndex, weight, reps, restSeconds) =>
      mutate((w) => {
        const now = Date.now();
        const s: SetLog = { id: uid(), kind: 'work', weight, reps, doneAt: new Date(now).toISOString() };
        const next = mapEntry(w, entryIndex, (e) => ({ ...e, sets: [...e.sets, s] }));
        return { ...next, cursor: { ...cursor(w), restEndsAt: new Date(now + restSeconds * 1000).toISOString(), restTotal: restSeconds } };
      }),

    updateSet: (entryIndex, setId, patch) =>
      mutate((w) => mapEntry(w, entryIndex, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))),

    deleteSet: (entryIndex, setId) =>
      mutate((w) => mapEntry(w, entryIndex, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }))),

    goTo: (index) =>
      mutate((w) => ({ ...w, cursor: { ...cursor(w), index: Math.max(0, Math.min(w.entries.length - 1, index)) } })),

    addExercise: (exerciseId) =>
      mutate((w) => {
        const entries = [...w.entries, { exerciseId, sets: [] }];
        return { ...w, entries, cursor: { ...cursor(w), index: w.entries.length ? cursor(w).index : 0 } };
      }),

    removeEntry: (index) =>
      mutate((w) => {
        const entries = w.entries.filter((_, i) => i !== index);
        let idx = cursor(w).index;
        if (index < idx || idx >= entries.length) idx = Math.max(0, idx - 1);
        return { ...w, entries, cursor: { ...cursor(w), index: idx } };
      }),

    moveEntry: (from, to) =>
      mutate((w) => {
        const current = w.entries[cursor(w).index];
        const entries = moveItem(w.entries, from, to);
        return { ...w, entries, cursor: { ...cursor(w), index: Math.max(0, entries.indexOf(current)) } };
      }),

    setEntryNote: (index, note) => mutate((w) => mapEntry(w, index, (e) => ({ ...e, note: note.trim() || undefined }))),

    togglePause: () =>
      mutate((w) => {
        const c = cursor(w);
        if (c.pausedAt) {
          return { ...w, pausedMs: w.pausedMs + (Date.now() - new Date(c.pausedAt).getTime()), cursor: { ...c, pausedAt: undefined } };
        }
        return { ...w, cursor: { ...c, pausedAt: new Date().toISOString() } };
      }),

    addRest: (seconds) =>
      mutate((w) => {
        const c = cursor(w);
        if (!c.restEndsAt) return w;
        const end = Math.max(Date.now(), new Date(c.restEndsAt).getTime()) + seconds * 1000;
        return { ...w, cursor: { ...c, restEndsAt: new Date(end).toISOString(), restTotal: (c.restTotal ?? 0) + seconds } };
      }),

    skipRest: () => mutate((w) => ({ ...w, cursor: { ...cursor(w), restEndsAt: undefined, restTotal: undefined } })),

    finish: async () => {
      const w = get().active;
      if (!w) return null;
      const now = Date.now();
      const entries = w.entries.filter((e) => e.sets.length > 0);
      if (!entries.length) {
        await get().discard();
        return null;
      }
      const pausedAt = w.cursor?.pausedAt;
      const done: Workout = {
        ...w,
        entries,
        pausedMs: w.pausedMs + (pausedAt ? now - new Date(pausedAt).getTime() : 0),
        finishedAt: new Date(now).toISOString(),
        cursor: undefined,
      };
      set({ active: null, workouts: sortByStart([...get().workouts, done]) });
      await db.workouts.put(done);
      return done.id;
    },

    discard: async () => {
      const w = get().active;
      if (!w) return;
      set({ active: null });
      await db.workouts.delete(w.id);
    },

    deleteWorkout: async (id) => {
      set({ workouts: get().workouts.filter((w) => w.id !== id) });
      await db.workouts.delete(id);
    },
  };
});
