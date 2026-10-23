import { SYNCED_TABLES, type AthleticDB, type SyncedTable } from '../db/db';
import { tombstone } from './snapshot';

type Listener = (change: { table: SyncedTable; deleted?: string }) => void;

let suppressed = 0;
let listener: Listener = () => {};

/** Während Daten vom Server eingespielt werden, keine Änderungen melden und keine Zeitstempel setzen. */
export async function withoutTracking<T>(fn: () => Promise<T>): Promise<T> {
  suppressed++;
  try {
    return await fn();
  } finally {
    suppressed--;
  }
}

export function onLocalChange(fn: Listener) {
  listener = fn;
}

const installed = new WeakSet<AthleticDB>();

/**
 * Setzt bei jeder Änderung `updatedAt` und meldet sie, damit der Abgleich weiß,
 * dass etwas zu sichern ist. Löschungen werden als Grabstein gemeldet.
 */
export function installTracking(db: AthleticDB) {
  if (installed.has(db)) return;
  installed.add(db);
  for (const name of SYNCED_TABLES) {
    const table = db.table(name);
    table.hook('creating', (_key, obj: { updatedAt?: string }) => {
      if (suppressed) return;
      obj.updatedAt = new Date().toISOString();
      queueMicrotask(() => listener({ table: name }));
    });
    table.hook('updating', () => {
      if (suppressed) return undefined;
      queueMicrotask(() => listener({ table: name }));
      return { updatedAt: new Date().toISOString() };
    });
    table.hook('deleting', (key) => {
      if (suppressed) return;
      queueMicrotask(() => listener({ table: name, deleted: tombstone(name, String(key)) }));
    });
  }
}
