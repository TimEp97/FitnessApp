import type { Equipment, Exercise, Goal, ID, Level, Plan, PlanDay, PlanItem, Settings, Workout } from '../types';
import { MUSCLE_SHORT } from '../data/labels';
import { PLAN_TEMPLATES, type PlanTemplate } from '../data/templates';
import { uid } from './dates';
import { isFinished, sortByStart } from './metrics';

/** Nächster Tag des Plans: der Tag nach dem zuletzt trainierten, sonst der erste. */
export function nextPlanDay(plan: Plan | undefined, workouts: Workout[]): PlanDay | undefined {
  if (!plan || !plan.days.length) return undefined;
  const done = sortByStart(workouts.filter((w) => isFinished(w) && w.planId === plan.id));
  const last = done[done.length - 1];
  if (!last) return plan.days[0];
  const idx = plan.days.findIndex((d) => d.id === last.planDayId);
  return plan.days[(idx + 1) % plan.days.length];
}

export function daySetCount(day: PlanDay): number {
  return day.items.reduce((s, i) => s + i.sets, 0);
}

/** Geschätzte Dauer: je Satz rund 45 s Arbeit plus Pause, dazu 5 min zum Aufwärmen. Auf 5 min gerundet. */
export function estimateMinutes(day: PlanDay, restSeconds: number): number {
  const sets = daySetCount(day);
  if (!sets) return 0;
  const min = (sets * (45 + restSeconds)) / 60 + 5;
  return Math.max(5, Math.round(min / 5) * 5);
}

/** Muskelgruppen eines Plantags, nach Häufigkeit sortiert. */
export function dayMuscleGroups(day: PlanDay, exById: Map<ID, Exercise>, max = 4): string[] {
  const count = new Map<string, number>();
  for (const item of day.items) {
    const ex = exById.get(item.exerciseId);
    if (!ex) continue;
    for (const m of ex.primary) {
      const label = MUSCLE_SHORT[m];
      count.set(label, (count.get(label) ?? 0) + item.sets);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([l]) => l);
}

/** Geplante Wochentage (0 = Montag) für eine Anzahl Trainingstage pro Woche. */
export function plannedWeekdays(daysPerWeek: number): number[] {
  const map: Record<number, number[]> = {
    1: [2],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return map[Math.min(7, Math.max(1, Math.round(daysPerWeek)))] ?? [];
}

function adjustForGoal(item: PlanItem, goal: Goal): PlanItem {
  const compound = item.reps[0] <= 6;
  switch (goal) {
    case 'strength':
      return compound ? { ...item, sets: Math.min(5, item.sets + 1), reps: [4, 6] } : item;
    case 'fitness':
      return { ...item, sets: Math.min(3, item.sets), reps: [10, 15] };
    case 'endurance':
      return { ...item, sets: Math.min(3, item.sets), reps: [15, 20] };
    default:
      return item;
  }
}

/** Ersetzt Übungen, deren Equipment fehlt, durch eine Alternative mit gleichem Hauptmuskel. */
function substitute(exId: ID, equipment: Equipment[], exById: Map<ID, Exercise>, taken: Set<ID>, exercises: Exercise[]): Exercise | undefined {
  const ex = exById.get(exId);
  if (!ex) return undefined;
  if (!equipment.length || equipment.includes(ex.equipment)) return ex;
  return exercises.find(
    (e) => !taken.has(e.id) && equipment.includes(e.equipment) && e.primary[0] === ex.primary[0],
  ) ?? exercises.find((e) => !taken.has(e.id) && equipment.includes(e.equipment) && e.primary.includes(ex.primary[0]));
}

export function planFromTemplate(
  tpl: PlanTemplate,
  exercises: Exercise[],
  opts: { equipment?: Equipment[]; goal?: Goal; name?: string } = {},
): Plan {
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const days: PlanDay[] = tpl.days.map((d) => {
    const taken = new Set<ID>();
    const items: PlanItem[] = [];
    for (const [exId, sets, lo, hi] of d.items) {
      const ex = substitute(exId, opts.equipment ?? [], exById, taken, exercises);
      if (!ex) continue;
      taken.add(ex.id);
      const item: PlanItem = { exerciseId: ex.id, sets, reps: [lo, hi] };
      items.push(opts.goal ? adjustForGoal(item, opts.goal) : item);
    }
    return { id: uid(), name: d.name, items };
  });
  return { id: uid(), name: opts.name ?? tpl.name, days, createdAt: new Date().toISOString() };
}

export function emptyPlan(name = 'Neuer Plan'): Plan {
  return { id: uid(), name, days: [{ id: uid(), name: 'Tag 1', items: [] }], createdAt: new Date().toISOString() };
}

/** Passende Vorlage aus den Onboarding-Antworten. */
export function recommendTemplate(s: Pick<Settings, 'daysPerWeek' | 'experience'> & { experience: Level }): PlanTemplate {
  const byId = (id: string) => PLAN_TEMPLATES.find((t) => t.id === id)!;
  if (s.daysPerWeek <= 2) return byId('full-body');
  if (s.daysPerWeek === 3) return s.experience === 'beginner' ? byId('full-body') : byId('ppl');
  if (s.daysPerWeek === 4) return s.experience === 'beginner' ? byId('upper-lower') : byId('four-day-split');
  return byId('ppl');
}

export function duplicatePlan(plan: Plan): Plan {
  return {
    ...plan,
    id: uid(),
    name: `${plan.name} (Kopie)`,
    sample: undefined,
    createdAt: new Date().toISOString(),
    days: plan.days.map((d) => ({ ...d, id: uid(), items: d.items.map((i) => ({ ...i, reps: [...i.reps] as [number, number] })) })),
  };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  if (from < 0 || from >= copy.length) return copy;
  const [x] = copy.splice(from, 1);
  copy.splice(Math.max(0, Math.min(copy.length, to)), 0, x);
  return copy;
}
