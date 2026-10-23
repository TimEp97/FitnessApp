import type { BodyLog, Exercise, Plan, PlanDay, Settings, SetLog, Workout } from '../types';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { PLAN_TEMPLATES } from '../data/templates';
import { addDays, startOfDay, startOfWeek, uid } from '../logic/dates';
import { planFromTemplate } from '../logic/planning';
import type { AthleticDB } from './db';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  name: '',
  goal: 'muscle',
  experience: 'intermediate',
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'],
  restSeconds: 120,
  theme: 'system',
  hasSampleData: false,
  onboardingDone: false,
};

/** Startgewichte der Beispieldaten in kg. */
const BASE_WEIGHT: Record<string, number> = {
  'bench-press': 70,
  'incline-db-press': 24,
  'db-shoulder-press': 20,
  'lateral-raise': 8,
  'triceps-pushdown': 25,
  'pull-up': 0,
  'barbell-row': 60,
  'lat-pulldown': 55,
  'face-pull': 20,
  'db-curl': 12,
  squat: 85,
  'romanian-deadlift': 70,
  'leg-press': 140,
  'leg-curl': 40,
  crunch: 0,
  'seated-cable-row': 55,
  deadlift: 110,
  'overhead-press': 42.5,
  'db-lunge': 16,
  'hammer-curl': 14,
};

/** Deterministischer Zufallsgenerator, damit Beispieldaten reproduzierbar sind. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export interface SampleData {
  plans: Plan[];
  workouts: Workout[];
  bodyLogs: BodyLog[];
  activePlanId: string;
}

/** Drei Pläne, Workouts der letzten 12 Wochen und wöchentliche Körpergewichte. */
export function generateSampleData(exercises: Exercise[], now: Date = new Date()): SampleData {
  const rnd = mulberry32(1997);
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const tpl = (id: string) => PLAN_TEMPLATES.find((t) => t.id === id)!;
  const ppl = { ...planFromTemplate(tpl('ppl'), exercises), sample: true };
  const upperLower = { ...planFromTemplate(tpl('upper-lower'), exercises), sample: true };
  const fullBody = { ...planFromTemplate(tpl('full-body'), exercises), sample: true };

  const workouts: Workout[] = [];
  const today = startOfDay(now);
  const thisWeek = startOfWeek(now);
  const totalWeeks = 12;
  let pplIndex = 0;
  let fbIndex = 0;

  for (let w = totalWeeks; w >= 0; w--) {
    const weekStart = addDays(thisWeek, -7 * w);
    const usesFullBody = w > 9;
    const schedule = usesFullBody ? [0, 3] : w === 6 ? [1] : w % 4 === 1 ? [0, 2, 4, 5] : [0, 2, 4];
    for (const dow of schedule) {
      const date = addDays(weekStart, dow);
      if (date >= today) continue;
      const plan = usesFullBody ? fullBody : ppl;
      const day: PlanDay = usesFullBody ? plan.days[fbIndex++ % plan.days.length] : plan.days[pplIndex++ % plan.days.length];
      // Fortschritt von 0 (vor 12 Wochen) bis 1 (heute)
      const progress = 1 - w / totalWeeks;
      const start = new Date(date);
      start.setHours(17 + Math.floor(rnd() * 3), Math.floor(rnd() * 60), 0, 0);
      let t = start.getTime() + 5 * 60000;
      const entries = day.items.map((item) => {
        const ex = exById.get(item.exerciseId)!;
        const base = BASE_WEIGHT[item.exerciseId] ?? 20;
        const weight = base > 0 ? roundTo(base * (1 + 0.14 * progress + (rnd() - 0.5) * 0.03), ex.weightStep) : 0;
        const sets: SetLog[] = [];
        if (item.reps[1] <= 10 && base >= 40) {
          t += 120000;
          sets.push({ id: uid(), kind: 'warmup', weight: roundTo(weight * 0.5, ex.weightStep), reps: 10, doneAt: new Date(t).toISOString() });
        }
        for (let i = 0; i < item.sets; i++) {
          t += 150000 + Math.floor(rnd() * 40000);
          const [lo, hi] = item.reps;
          const reps = Math.max(lo - 1, Math.min(hi, Math.round(lo + (hi - lo) * (0.35 + 0.5 * progress) - i * 0.7 + (rnd() - 0.5) * 2)));
          sets.push({ id: uid(), kind: 'work', weight, reps, doneAt: new Date(t).toISOString() });
        }
        return { exerciseId: item.exerciseId, target: { sets: item.sets, reps: item.reps }, sets };
      });
      workouts.push({
        id: uid(),
        planId: plan.id,
        planDayId: day.id,
        name: day.name,
        startedAt: start.toISOString(),
        finishedAt: new Date(t + 60000).toISOString(),
        pausedMs: 0,
        entries,
        sample: true,
      });
    }
  }

  const bodyLogs: BodyLog[] = [];
  for (let w = totalWeeks; w >= 0; w--) {
    const date = addDays(thisWeek, -7 * w);
    if (date > today) continue;
    const weight = Math.round((84 - 2.4 * (1 - w / totalWeeks) + (rnd() - 0.5) * 0.6) * 10) / 10;
    bodyLogs.push({ id: uid(), date: date.toISOString(), weight, sample: true });
  }

  return { plans: [ppl, upperLower, fullBody], workouts, bodyLogs, activePlanId: ppl.id };
}

/** Beim ersten Start: Übungsbibliothek und Beispieldaten anlegen. Danach nur neue eingebaute Übungen ergänzen. */
export async function ensureSeeded(database: AthleticDB, now: Date = new Date()): Promise<void> {
  const existing = await database.settings.get('settings');
  if (existing) {
    const known = new Set(await database.exercises.toCollection().primaryKeys());
    const missing = BUILTIN_EXERCISES.filter((e) => !known.has(e.id));
    if (missing.length) await database.exercises.bulkPut(missing);
    return;
  }
  const sample = generateSampleData(BUILTIN_EXERCISES, now);
  await database.transaction('rw', database.allTables, async () => {
    await database.exercises.bulkPut(BUILTIN_EXERCISES);
    await database.plans.bulkPut(sample.plans);
    await database.workouts.bulkPut(sample.workouts);
    await database.bodyLogs.bulkPut(sample.bodyLogs);
    await database.settings.put({ ...DEFAULT_SETTINGS, activePlanId: sample.activePlanId, hasSampleData: true });
  });
}
