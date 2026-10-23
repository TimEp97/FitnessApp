import { create } from 'zustand';
import type { BodyLog } from '../types';
import { db } from '../db/db';
import { dayKey, uid } from '../logic/dates';

interface BodyState {
  logs: BodyLog[];
  setAll: (list: BodyLog[]) => void;
  /** Ein Eintrag pro Tag: ein neuer Wert ersetzt den Wert desselben Tages. */
  logWeight: (weight: number, date?: Date) => Promise<void>;
}

const sorted = (list: BodyLog[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));

export const useBody = create<BodyState>((set, get) => ({
  logs: [],
  setAll: (list) => set({ logs: sorted(list) }),
  logWeight: async (weight, date = new Date()) => {
    const key = dayKey(date);
    const same = get().logs.find((l) => dayKey(new Date(l.date)) === key);
    const log: BodyLog = same ? { ...same, weight, sample: undefined } : { id: uid(), date: date.toISOString(), weight };
    set({ logs: sorted([...get().logs.filter((l) => l.id !== log.id), log]) });
    await db.bodyLogs.put(log);
  },
}));
