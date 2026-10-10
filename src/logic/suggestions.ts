import type { Equipment, Exercise, ID, Level, MuscleId, Plan, Workout } from '../types';
import { MUSCLE_LABEL } from '../data/labels';
import type { Session } from './metrics';
import { muscleLoad } from './muscleLoad';
import { daysBetween } from './dates';
import { fmtNumber, fmtWeight } from './format';

// ---------- Gewichtsvorschlag (7.3) ----------

export type WeightSuggestion =
  | { kind: 'none'; text: string }
  | { kind: 'increase' | 'repeat' | 'decrease'; weight: number; reps: number; text: string };

function topWeightAndBestReps(sets: Session['sets']): { weight: number; reps: number } {
  const weight = Math.max(...sets.map((s) => s.weight));
  const reps = Math.max(...sets.filter((s) => s.weight === weight).map((s) => s.reps));
  return { weight, reps };
}

const missedLowerEnd = (session: Session, low: number) => topWeightAndBestReps(session.sets).reps < low;

/**
 * Vorschlag für den nächsten Arbeitssatz auf Basis der letzten Einheit(en).
 * `history` enthält nur Arbeitssätze, älteste Einheit zuerst.
 */
export function suggestWeight(history: Session[], reps: [number, number], step: number): WeightSuggestion {
  const sessions = history.filter((s) => s.sets.length > 0);
  if (!sessions.length) {
    return { kind: 'none', text: 'Noch keine Historie. Protokolliere zuerst einen Satz, dann gibt es einen Vorschlag.' };
  }
  const [low, high] = reps;
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const { weight, reps: bestReps } = topWeightAndBestReps(last.sets);

  if (last.sets.every((s) => s.reps >= high)) {
    const w = weight + step;
    return { kind: 'increase', weight: w, reps: low, text: `Vorschlag: ${fmtWeight(w)} kg × ${low}. Letztes Mal hast du alle Sätze mit ${high} oder mehr Wiederholungen geschafft.` };
  }
  if (prev && missedLowerEnd(last, low) && missedLowerEnd(prev, low)) {
    const w = Math.max(0, weight - step);
    return { kind: 'decrease', weight: w, reps: low, text: `Vorschlag: ${fmtWeight(w)} kg × ${low}. Das untere Ende von ${low} Wiederholungen wurde zweimal in Folge verfehlt.` };
  }
  const r = Math.min(high, bestReps + 1);
  return { kind: 'repeat', weight, reps: r, text: `Vorschlag: ${fmtWeight(weight)} kg × ${r}. Gleiches Gewicht, eine Wiederholung mehr als dein bester Satz.` };
}

// ---------- Übungsvorschläge (7.4) ----------

export interface ExerciseSuggestion {
  exercise: Exercise;
  muscle: MuscleId;
  reason: string;
}

const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function planExerciseIds(plan: Plan | undefined): Set<ID> {
  return new Set(plan?.days.flatMap((d) => d.items.map((i) => i.exerciseId)) ?? []);
}

export function suggestExercises(opts: {
  workouts: Workout[];
  exercises: Exercise[];
  plan?: Plan;
  equipment: Equipment[];
  experience: Level;
  now?: Date;
  max?: number;
}): ExerciseSuggestion[] {
  const now = opts.now ?? new Date();
  const max = opts.max ?? 3;
  const exById = new Map(opts.exercises.map((e) => [e.id, e]));
  const load = muscleLoad(opts.workouts, exById, 30, now);
  const used = planExerciseIds(opts.plan);
  const allowed = (e: Exercise) => opts.equipment.length === 0 || opts.equipment.includes(e.equipment);

  const sinceDays = (m: MuscleId) => {
    const last = load[m].lastTrained;
    return last ? daysBetween(new Date(last), now) : Infinity;
  };

  const grey = (Object.keys(load) as MuscleId[])
    .filter((m) => load[m].level === 'none')
    .sort((a, b) => sinceDays(b) - sinceDays(a));

  const picked = new Set<ID>();
  const out: ExerciseSuggestion[] = [];
  for (const muscle of grey) {
    if (out.length >= max) break;
    const candidates = opts.exercises
      .filter((e) => e.primary.includes(muscle) && allowed(e) && !used.has(e.id) && !picked.has(e.id))
      .sort((a, b) => {
        const focus = Number(b.primary[0] === muscle) - Number(a.primary[0] === muscle);
        if (focus) return focus;
        const fitA = Number(LEVEL_RANK[a.level] <= LEVEL_RANK[opts.experience]);
        const fitB = Number(LEVEL_RANK[b.level] <= LEVEL_RANK[opts.experience]);
        if (fitA !== fitB) return fitB - fitA;
        return a.primary.length - b.primary.length || a.name.localeCompare(b.name, 'de');
      });
    const exercise = candidates[0];
    if (!exercise) continue;
    picked.add(exercise.id);
    const days = sinceDays(muscle);
    const label = MUSCLE_LABEL[muscle];
    const reason =
      days === Infinity
        ? `${label}: bisher nicht trainiert`
        : days > 30
          ? `${label}: seit über 30 Tagen nicht trainiert`
          : days >= 2
            ? `${label}: seit ${days} Tagen nicht trainiert`
            : `${label}: im Schnitt nur ${fmtNumber(load[muscle].weekly, 1)} Sätze pro Woche`;
    out.push({ exercise, muscle, reason });
  }
  return out;
}
