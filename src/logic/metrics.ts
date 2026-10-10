import type { ID, SetLog, Workout } from '../types';
import { startOfWeek, weekKey, addDays } from './dates';

export const workSets = (sets: SetLog[]): SetLog[] => sets.filter((s) => s.kind === 'work');

export const setVolume = (s: SetLog): number => s.weight * s.reps;

/** Volumen = Summe Gewicht × Wiederholungen aller Arbeitssätze. */
export function volumeOfSets(sets: SetLog[]): number {
  return workSets(sets).reduce((sum, s) => sum + setVolume(s), 0);
}

export function workoutVolume(w: Workout): number {
  return w.entries.reduce((sum, e) => sum + volumeOfSets(e.sets), 0);
}

export function workoutWorkSetCount(w: Workout): number {
  return w.entries.reduce((sum, e) => sum + workSets(e.sets).length, 0);
}

export function workoutSetCount(w: Workout): number {
  return w.entries.reduce((sum, e) => sum + e.sets.length, 0);
}

/** Geschätztes 1RM nach Epley, nur für 1 bis 12 Wiederholungen. */
export function epley1RM(weight: number, reps: number): number | null {
  if (reps < 1 || reps > 12 || weight <= 0) return null;
  return weight * (1 + reps / 30);
}

export function best1RM(sets: SetLog[]): number | null {
  let best: number | null = null;
  for (const s of workSets(sets)) {
    const e = epley1RM(s.weight, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

/** Trainingsdauer ohne Pausen. Bei laufendem Workout bis `now`. */
export function workoutDurationMs(w: Workout, now: number = Date.now()): number {
  const end = w.finishedAt ? new Date(w.finishedAt).getTime() : now;
  let paused = w.pausedMs;
  if (!w.finishedAt && w.cursor?.pausedAt) paused += now - new Date(w.cursor.pausedAt).getTime();
  return Math.max(0, end - new Date(w.startedAt).getTime() - paused);
}

export const isFinished = (w: Workout): boolean => Boolean(w.finishedAt);

export function sortByStart(workouts: Workout[]): Workout[] {
  return [...workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

// ---------- Rekorde ----------

export type RecordType = 'weight' | 'e1rm' | 'setVolume';

export const RECORD_LABEL: Record<RecordType, string> = {
  weight: 'Höchstes Gewicht',
  e1rm: 'Geschätztes 1RM',
  setVolume: 'Satzvolumen',
};

export interface RecordValue {
  value: number;
  date: string;
  workoutId: ID;
  /** Gewicht × Wiederholungen des Satzes */
  weight: number;
  reps: number;
}

export interface ExerciseRecords {
  exerciseId: ID;
  weight?: RecordValue;
  e1rm?: RecordValue;
  setVolume?: RecordValue;
}

export interface RecordEvent {
  exerciseId: ID;
  type: RecordType;
  value: number;
  previous: number;
  date: string;
  workoutId: ID;
  weight: number;
  reps: number;
}

function sessionBests(sets: SetLog[]): Partial<Record<RecordType, { value: number; weight: number; reps: number }>> {
  const out: Partial<Record<RecordType, { value: number; weight: number; reps: number }>> = {};
  for (const s of workSets(sets)) {
    const candidates: [RecordType, number | null][] = [
      ['weight', s.weight > 0 ? s.weight : null],
      ['e1rm', epley1RM(s.weight, s.reps)],
      ['setVolume', s.weight > 0 ? setVolume(s) : null],
    ];
    for (const [type, value] of candidates) {
      if (value === null) continue;
      const cur = out[type];
      if (!cur || value > cur.value) out[type] = { value, weight: s.weight, reps: s.reps };
    }
  }
  return out;
}

/**
 * Läuft chronologisch durch alle abgeschlossenen Workouts und liefert
 * die Rekorde je Übung sowie jedes Ereignis, bei dem ein Rekord verbessert wurde.
 * Die erste Einheit einer Übung zählt nicht als neuer Rekord.
 */
export function analyzeRecords(workouts: Workout[]): { records: Map<ID, ExerciseRecords>; events: RecordEvent[] } {
  const records = new Map<ID, ExerciseRecords>();
  const events: RecordEvent[] = [];
  for (const w of sortByStart(workouts.filter(isFinished))) {
    for (const entry of w.entries) {
      const bests = sessionBests(entry.sets);
      let rec = records.get(entry.exerciseId);
      const firstTime = !rec;
      if (!rec) {
        rec = { exerciseId: entry.exerciseId };
        records.set(entry.exerciseId, rec);
      }
      for (const type of ['weight', 'e1rm', 'setVolume'] as RecordType[]) {
        const b = bests[type];
        if (!b) continue;
        const prev = rec[type];
        if (!prev || b.value > prev.value + 1e-9) {
          if (prev && !firstTime) {
            events.push({ exerciseId: entry.exerciseId, type, value: b.value, previous: prev.value, date: w.startedAt, workoutId: w.id, weight: b.weight, reps: b.reps });
          }
          rec[type] = { value: b.value, date: w.startedAt, workoutId: w.id, weight: b.weight, reps: b.reps };
        }
      }
    }
  }
  return { records, events };
}

export function recordsInWorkout(workouts: Workout[], workoutId: ID): RecordEvent[] {
  return analyzeRecords(workouts).events.filter((e) => e.workoutId === workoutId);
}

/** Letzter Rekord; je Workout hat das geschätzte 1RM Vorrang. */
export function latestRecord(workouts: Workout[]): RecordEvent | null {
  const { events } = analyzeRecords(workouts);
  if (!events.length) return null;
  const lastWorkout = events[events.length - 1].workoutId;
  const inLast = events.filter((e) => e.workoutId === lastWorkout);
  const order: RecordType[] = ['e1rm', 'weight', 'setVolume'];
  inLast.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || b.value / b.previous - a.value / a.previous);
  return inLast[0];
}

// ---------- Zeitreihen ----------

export interface Session {
  workoutId: ID;
  date: string;
  planDayId?: ID;
  sets: SetLog[];
}

/** Abgeschlossene Einheiten einer Übung, älteste zuerst. Enthält nur Arbeitssätze. */
export function exerciseHistory(workouts: Workout[], exerciseId: ID): Session[] {
  const out: Session[] = [];
  for (const w of sortByStart(workouts.filter(isFinished))) {
    for (const e of w.entries) {
      if (e.exerciseId !== exerciseId) continue;
      const sets = workSets(e.sets);
      if (sets.length) out.push({ workoutId: w.id, date: w.startedAt, planDayId: w.planDayId, sets });
    }
  }
  return out;
}

/** Anzahl aufeinanderfolgender Kalenderwochen mit mindestens einem Workout. Die laufende Woche bricht die Serie nicht. */
export function streakWeeks(workouts: Workout[], now: Date = new Date()): number {
  const weeks = new Set(workouts.filter(isFinished).map((w) => weekKey(new Date(w.startedAt))));
  let cursor = startOfWeek(now);
  if (!weeks.has(weekKey(cursor))) cursor = addDays(cursor, -7);
  let count = 0;
  while (weeks.has(weekKey(cursor))) {
    count++;
    cursor = addDays(cursor, -7);
  }
  return count;
}

export function workoutsBetween(workouts: Workout[], from: Date, to: Date): Workout[] {
  const a = from.getTime();
  const b = to.getTime();
  return workouts.filter((w) => {
    if (!w.finishedAt) return false;
    const t = new Date(w.startedAt).getTime();
    return t >= a && t < b;
  });
}

export interface WeekBucket {
  start: Date;
  workouts: Workout[];
  volume: number;
  minutes: number;
}

/** Die letzten `count` Kalenderwochen inklusive der laufenden, älteste zuerst. */
export function weeklyBuckets(workouts: Workout[], count: number, now: Date = new Date()): WeekBucket[] {
  const current = startOfWeek(now);
  const out: WeekBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(current, -7 * i);
    const ws = workoutsBetween(workouts, start, addDays(start, 7));
    out.push({
      start,
      workouts: ws,
      volume: ws.reduce((s, w) => s + workoutVolume(w), 0),
      minutes: ws.reduce((s, w) => s + workoutDurationMs(w), 0) / 60000,
    });
  }
  return out;
}
