import { create } from 'zustand';
import type { Settings } from '../types';
import { db } from '../db/db';
import { DEFAULT_SETTINGS } from '../db/seed';

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  update: async (patch) => {
    const next = { ...get().settings, ...patch, id: 'settings' as const };
    set({ settings: next });
    await db.settings.put(next);
  },
}));
