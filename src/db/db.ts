import Dexie, { type DexieOptions, type Table } from 'dexie';
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

  constructor(name = 'athletic', options?: DexieOptions) {
    super(name, options);
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

/** Datenbank aus der Zeit vor den Konten; heute nur noch für die Vorschau und zum Übernehmen alter Daten. */
export const LEGACY_DB = 'athletic';

/** Jedes Konto hat auf dem Gerät eine eigene Datenbank, damit sich Nutzer auf einem Gerät nicht mischen. */
export const userDbName = (userId: number) => `athletic-u${userId}`;

export let db = new AthleticDB(LEGACY_DB);

/** true, wenn der Browser keine Datenbank erlaubt und die App nur im Arbeitsspeicher läuft */
export let isMemoryDb = false;

/** Öffnet die Datenbank. Verweigert der Browser IndexedDB, läuft die App im Arbeitsspeicher weiter. */
export async function openDatabase(name: string = db.name): Promise<void> {
  if (db.name !== name) {
    db.close();
    db = new AthleticDB(name);
  }
  if (db.isOpen()) return;
  try {
    await db.open();
  } catch {
    const { indexedDB, IDBKeyRange } = await import('fake-indexeddb');
    db = new AthleticDB(name, { indexedDB, IDBKeyRange });
    isMemoryDb = true;
    await db.open();
  }
}

export async function deleteDatabase(name: string): Promise<void> {
  if (db.name === name) db.close();
  try {
    await Dexie.delete(name);
  } catch {
    // nicht vorhanden oder blockiert
  }
}
