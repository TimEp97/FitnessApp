import Dexie from 'dexie';
import { AthleticDB, LEGACY_DB, db } from '../db/db';
import { readSnapshot, type Snapshot } from '../sync/snapshot';

/**
 * Daten aus der Zeit vor den Konten (Datenbank „athletic“ auf diesem Gerät).
 * Sie werden einmal angeboten und danach als erledigt markiert.
 */

const CLAIM_KEY = 'claimedBy';

async function openLegacy(): Promise<AthleticDB | null> {
  try {
    if (!(await Dexie.exists(LEGACY_DB))) return null;
    const legacy = new AthleticDB(LEGACY_DB);
    await legacy.open();
    return legacy;
  } catch {
    return null;
  }
}

/** Schlüssel der früheren Server-Sicherung; dient beim ersten Admin-Konto als Einrichtungscode. */
export async function legacySyncKey(): Promise<string> {
  const legacy = await openLegacy();
  if (!legacy) return '';
  try {
    const row = await legacy.meta.get('sync');
    const key = (row?.value as { config?: { key?: unknown } } | undefined)?.config?.key;
    return typeof key === 'string' ? key : '';
  } finally {
    legacy.close();
  }
}

export interface LegacyOffer {
  snapshot: Snapshot;
  /** eigene Trainings (ohne Beispieldaten), die im Konto noch fehlen */
  newWorkouts: number;
  newBodyLogs: number;
}

/** Eigene Daten der alten Datenbank, die im angemeldeten Konto noch fehlen; null, wenn nichts zu übernehmen ist. */
export async function findLegacyData(userId: number): Promise<LegacyOffer | null> {
  const legacy = await openLegacy();
  if (!legacy) return null;
  try {
    if ((await legacy.meta.get(CLAIM_KEY))?.value) return null;
    const snap = await readSnapshot(legacy, []);
    const own: Snapshot = {
      ...snap,
      plans: snap.plans.filter((p) => !p.sample),
      workouts: snap.workouts.filter((w) => !w.sample && w.finishedAt),
      bodyLogs: snap.bodyLogs.filter((b) => !b.sample),
      exercises: snap.exercises.filter((e) => e.custom),
      // Einstellungen des Kontos nicht überschreiben
      settings: null,
    };
    const [haveWorkouts, haveLogs] = await Promise.all([db.workouts.toCollection().primaryKeys(), db.bodyLogs.toCollection().primaryKeys()]);
    const newWorkouts = own.workouts.filter((w) => !haveWorkouts.includes(w.id)).length;
    const newBodyLogs = own.bodyLogs.filter((b) => !haveLogs.includes(b.id)).length;
    if (!newWorkouts && !newBodyLogs) {
      await legacy.meta.put({ key: CLAIM_KEY, value: userId });
      return null;
    }
    return { snapshot: own, newWorkouts, newBodyLogs };
  } catch {
    return null;
  } finally {
    legacy.close();
  }
}

/** Merkt sich, dass die alten Daten übernommen oder abgelehnt wurden. */
export async function markLegacyHandled(userId: number): Promise<void> {
  const legacy = await openLegacy();
  if (!legacy) return;
  try {
    await legacy.meta.put({ key: CLAIM_KEY, value: userId });
  } finally {
    legacy.close();
  }
}
