import type { BodyLog, Exercise, Plan, Settings, Workout } from '../types';
import type { AthleticDB, SyncedTable } from '../db/db';

/** Kompletter Datenstand, wie er mit dem Server ausgetauscht wird. */
export interface Snapshot {
  exercises: Exercise[];
  plans: Plan[];
  workouts: Workout[];
  bodyLogs: BodyLog[];
  settings: Settings | null;
  /** Gelöschte Datensätze als „tabelle:id“, damit sie auf anderen Geräten nicht wieder auftauchen */
  deleted: string[];
}

type Row = { id: string; updatedAt?: string };

export const tombstone = (table: SyncedTable, id: string) => `${table}:${id}`;

function mergeTable<T extends Row>(table: SyncedTable, local: T[], remote: T[], deleted: Set<string>): T[] {
  const out = new Map<string, T>();
  for (const r of remote) if (!deleted.has(tombstone(table, r.id))) out.set(r.id, r);
  for (const l of local) {
    if (deleted.has(tombstone(table, l.id))) continue;
    const r = out.get(l.id);
    // neuerer Stand gewinnt, bei Gleichstand der lokale
    if (!r || (l.updatedAt ?? '') >= (r.updatedAt ?? '')) out.set(l.id, l);
  }
  return [...out.values()];
}

/** Führt zwei Stände zusammen: Vereinigung je ID, neuerer Datensatz gewinnt, Löschungen gelten überall. */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const deleted = new Set([...local.deleted, ...remote.deleted]);
  const settings =
    !remote.settings || (local.settings && (local.settings.updatedAt ?? '') >= (remote.settings.updatedAt ?? '')) ? local.settings : remote.settings;
  return {
    exercises: mergeTable('exercises', local.exercises, remote.exercises, deleted),
    plans: mergeTable('plans', local.plans, remote.plans, deleted),
    workouts: mergeTable('workouts', local.workouts, remote.workouts, deleted),
    bodyLogs: mergeTable('bodyLogs', local.bodyLogs, remote.bodyLogs, deleted),
    settings,
    deleted: [...deleted].sort(),
  };
}

/** Vergleichbarer Fingerabdruck eines Stands, unabhängig von der Reihenfolge. */
export function fingerprint(s: Snapshot): string {
  const sortRows = <T extends Row>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id)).map((r) => `${r.id}@${r.updatedAt ?? ''}`);
  return JSON.stringify([
    sortRows(s.exercises),
    sortRows(s.plans),
    sortRows(s.workouts),
    sortRows(s.bodyLogs),
    s.settings?.updatedAt ?? '',
    [...s.deleted].sort(),
  ]);
}

export function emptySnapshot(): Snapshot {
  return { exercises: [], plans: [], workouts: [], bodyLogs: [], settings: null, deleted: [] };
}

export async function readSnapshot(db: AthleticDB, deleted: string[]): Promise<Snapshot> {
  const [exercises, plans, workouts, bodyLogs, settings] = await Promise.all([
    db.exercises.toArray(),
    db.plans.toArray(),
    db.workouts.toArray(),
    db.bodyLogs.toArray(),
    db.settings.get('settings'),
  ]);
  return { exercises, plans, workouts, bodyLogs, settings: settings ?? null, deleted: [...deleted] };
}

/** Prüft einen Stand vom Server grob auf Plausibilität. */
export function isSnapshot(x: unknown): x is Snapshot {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return ['exercises', 'plans', 'workouts', 'bodyLogs', 'deleted'].every((k) => Array.isArray(o[k]));
}
