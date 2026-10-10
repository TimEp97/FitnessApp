import Dexie, { type Table } from 'dexie';
import type { BodyLog, Exercise, Plan, Settings, Workout } from '../types';

/** Technische Einträge, die nicht zu den Nutzerdaten gehören (z. B. Sync-Zustand). */
export interface MetaRow {
  key: string;
  value: unknown;
}

export const SYNCED_TABLES = ['exercises', 'plans', 'workouts', 'bodyLogs', 'settings'] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export class AthleticDB extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<Plan, string>;
  workouts!: Table<Workout, string>;
  bodyLogs!: Table<BodyLog, string>;
  settings!: Table<Settings, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'athletic') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name',
      plans: 'id',
      workouts: 'id, startedAt',
      bodyLogs: 'id, date',
      settings: 'id',
    });
    this.version(2).stores({ meta: 'key' });
  }

  /** Alle Tabellen mit Nutzerdaten (ohne meta). */
  get allTables() {
    return [this.exercises, this.plans, this.workouts, this.bodyLogs, this.settings];
  }
}

export const db = new AthleticDB();
