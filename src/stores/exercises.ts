import { create } from 'zustand';
import type { Exercise, ID } from '../types';
import { db } from '../db/db';

interface ExerciseState {
  exercises: Exercise[];
  byId: Map<ID, Exercise>;
  setAll: (list: Exercise[]) => void;
  add: (ex: Exercise) => Promise<void>;
  remove: (id: ID) => Promise<void>;
}

const sorted = (list: Exercise[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'de'));

export const useExercises = create<ExerciseState>((set, get) => ({
  exercises: [],
  byId: new Map(),
  setAll: (list) => {
    const s = sorted(list);
    set({ exercises: s, byId: new Map(s.map((e) => [e.id, e])) });
  },
  add: async (ex) => {
    get().setAll([...get().exercises.filter((e) => e.id !== ex.id), ex]);
    await db.exercises.put(ex);
  },
  remove: async (id) => {
    const ex = get().byId.get(id);
    if (!ex?.custom) return;
    get().setAll(get().exercises.filter((e) => e.id !== id));
    await db.exercises.delete(id);
  },
}));
