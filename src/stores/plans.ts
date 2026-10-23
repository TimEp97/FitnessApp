import { create } from 'zustand';
import type { ID, Plan } from '../types';
import { db } from '../db/db';
import { useSettings } from './settings';

interface PlanState {
  plans: Plan[];
  setAll: (list: Plan[]) => void;
  save: (plan: Plan) => Promise<void>;
  remove: (id: ID) => Promise<void>;
  activate: (id: ID) => Promise<void>;
}

const sorted = (list: Plan[]) => [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const usePlans = create<PlanState>((set, get) => ({
  plans: [],
  setAll: (list) => set({ plans: sorted(list) }),
  save: async (plan) => {
    set({ plans: sorted([...get().plans.filter((p) => p.id !== plan.id), plan]) });
    await db.plans.put(plan);
  },
  remove: async (id) => {
    const rest = get().plans.filter((p) => p.id !== id);
    set({ plans: rest });
    await db.plans.delete(id);
    const { settings, update } = useSettings.getState();
    if (settings.activePlanId === id) await update({ activePlanId: rest[0]?.id });
  },
  activate: (id) => useSettings.getState().update({ activePlanId: id }),
}));

export function useActivePlan(): Plan | undefined {
  const plans = usePlans((s) => s.plans);
  const activeId = useSettings((s) => s.settings.activePlanId);
  return plans.find((p) => p.id === activeId);
}
