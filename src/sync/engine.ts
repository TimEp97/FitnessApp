import { create } from 'zustand';
import { db } from '../db/db';
import { fingerprint, isSnapshot, mergeSnapshots, readSnapshot, type Snapshot } from './snapshot';
import { onLocalChange, withoutTracking } from './tracking';
import { IS_PREVIEW } from '../env';
import { ApiError, apiRequest } from '../api/client';
import { useAuth } from '../auth/auth';

/**
 * Abgleich mit dem eigenen Server (api/sync.php, z. B. bei all-inkl), getrennt pro Konto.
 * Der Browser bleibt die Hauptdatenquelle; der Server hält eine Kopie und eine Tageshistorie.
 */

const META_KEY = 'sync';

interface SyncMeta {
  /** Serverrevision, auf der der lokale Stand beruht */
  revision: number;
  /** lokale Änderungen, die noch nicht auf dem Server sind */
  dirty: boolean;
  lastSyncAt?: string;
  /** Grabsteine gelöschter Datensätze */
  deleted: string[];
  /** nächster Upload ersetzt den Serverstand (nach „Alle Daten löschen“ oder Import) */
  resetPending?: boolean;
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'ok' | 'offline' | 'error';

export interface RemoteInfo {
  revision: number;
  savedAt?: string;
  data: Snapshot | null;
}

interface SyncState {
  meta: SyncMeta;
  status: SyncStatus;
  error?: string;
  /** dauerhafter Browser-Speicher gewährt? undefined = unbekannt */
  persisted?: boolean;
}

const initialMeta: SyncMeta = { revision: 0, dirty: false, deleted: [] };

/** Gesichert wird, solange jemand angemeldet ist (nicht in der Vorschau). */
export function syncEnabled(): boolean {
  const { user, expired } = useAuth.getState();
  return !IS_PREVIEW && Boolean(user) && !expired;
}

export const useSync = create<SyncState>(() => ({ meta: initialMeta, status: 'off' }));

const getMeta = () => useSync.getState().meta;

async function saveMeta(patch: Partial<SyncMeta>) {
  const meta = { ...getMeta(), ...patch };
  useSync.setState({ meta });
  await db.meta.put({ key: META_KEY, value: meta });
}

function toRemote(body: unknown): RemoteInfo {
  const o = (body ?? {}) as Record<string, unknown>;
  const data = o.data ?? null;
  if (data !== null && !isSnapshot(data)) throw new ApiError('http', 200, 'format', 'Die Daten auf dem Server sind beschädigt.');
  return { revision: typeof o.revision === 'number' ? o.revision : 0, savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined, data };
}

export async function fetchRemote(): Promise<RemoteInfo> {
  return toRemote(await apiRequest('sync.php'));
}

class Conflict extends Error {}

async function pushRemote(data: Snapshot, baseRevision: number, force = false): Promise<number> {
  let body: { revision?: number };
  try {
    body = await apiRequest('sync.php', { method: 'PUT', body: { baseRevision, force, data } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) throw new Conflict();
    throw e;
  }
  if (typeof body?.revision !== 'number') throw new ApiError('http', 200, 'format', 'Ungültige Antwort beim Speichern.');
  return body.revision;
}

/** Schreibt einen Stand in die lokale Datenbank, ohne ihn als Änderung zu melden. */
async function writeLocally(snap: Snapshot) {
  await withoutTracking(() =>
    db.transaction('rw', db.allTables, async () => {
      for (const t of db.allTables) await t.clear();
      await db.exercises.bulkPut(snap.exercises);
      await db.plans.bulkPut(snap.plans);
      await db.workouts.bulkPut(snap.workouts);
      await db.bodyLogs.bulkPut(snap.bodyLogs);
      if (snap.settings) await db.settings.put(snap.settings);
    }),
  );
}

/** Spielt einen Stand lokal ein und lädt die Stores neu. */
async function applyLocally(snap: Snapshot) {
  await writeLocally(snap);
  const { loadAll } = await import('../stores/data');
  await loadAll();
}

// ---------- Änderungen verfolgen ----------

let changeSeq = 0;
let timer: number | undefined;
let metaTimer: number | undefined;

/** Wartezeit nach einer Änderung, bevor gesichert wird: Sätze und Workouts sofort, sonst kurz gebündelt. */
const DELAY_WORKOUT_MS = 300;
const DELAY_OTHER_MS = 1500;

export function scheduleSync(delayMs = DELAY_OTHER_MS) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delayMs);
}

onLocalChange(({ table, deleted }) => {
  changeSeq++;
  const meta = getMeta();
  const next: Partial<SyncMeta> = { dirty: true };
  if (deleted && !meta.deleted.includes(deleted)) next.deleted = [...meta.deleted, deleted];
  useSync.setState({ meta: { ...meta, ...next } });
  // Metadaten gebündelt speichern
  window.clearTimeout(metaTimer);
  metaTimer = window.setTimeout(() => void saveMeta({}), 300);
  if (syncEnabled()) scheduleSync(table === 'workouts' ? DELAY_WORKOUT_MS : DELAY_OTHER_MS);
});

// ---------- Abgleich ----------

let inflight: Promise<void> | null = null;

/** Gleicht mit dem Server ab: holen, zusammenführen, hochladen. Mehrfachaufrufe werden gebündelt. */
export function syncNow(): Promise<void> {
  if (inflight) return inflight;
  inflight = runSync().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Für „Jetzt sichern“: wartet einen laufenden Abgleich ab und startet danach einen frischen. */
export async function syncAgain(): Promise<void> {
  if (inflight) await inflight.catch(() => undefined);
  return syncNow();
}

async function runSync() {
  if (!syncEnabled()) {
    useSync.setState({ status: 'off' });
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    useSync.setState({ status: 'offline' });
    return;
  }
  useSync.setState({ status: 'syncing', error: undefined });
  const seq = changeSeq;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const meta = getMeta();
      let local = await readSnapshot(db, meta.deleted);

      if (meta.resetPending) {
        const revision = await pushRemote({ ...local, deleted: [] }, meta.revision, true);
        await saveMeta({ revision, resetPending: false, deleted: [], lastSyncAt: new Date().toISOString(), dirty: changeSeq !== seq });
        break;
      }

      // Häufigster Fall (nur lokale Änderungen): direkt hochladen, ohne vorher zu holen.
      // Hat sich der Serverstand inzwischen geändert, kommt ein Konflikt und es wird zusammengeführt.
      if (attempt === 0 && meta.dirty && meta.revision >= 0) {
        try {
          const revision = await pushRemote(local, meta.revision);
          await saveMeta({ revision, lastSyncAt: new Date().toISOString(), dirty: changeSeq !== seq });
          break;
        } catch (e) {
          if (!(e instanceof Conflict)) throw e;
        }
      }

      const remote = await fetchRemote();
      let needPush = meta.dirty || !remote.data;
      let revision = meta.revision;
      if (remote.revision !== meta.revision) {
        if (remote.data) {
          const merged = mergeSnapshots(local, remote.data);
          if (fingerprint(merged) !== fingerprint(local)) await applyLocally(merged);
          local = merged;
          needPush = fingerprint(merged) !== fingerprint(remote.data);
        }
        revision = remote.revision;
        await saveMeta({ revision, deleted: local.deleted });
      }
      if (needPush) {
        try {
          revision = await pushRemote(local, revision);
        } catch (e) {
          if (e instanceof Conflict) continue; // erneut holen und zusammenführen
          throw e;
        }
      }
      await saveMeta({ revision, lastSyncAt: new Date().toISOString(), dirty: changeSeq !== seq });
      break;
    }
    useSync.setState({ status: 'ok' });
    if (getMeta().dirty) scheduleSync(DELAY_WORKOUT_MS);
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError('http', 0, 'unknown', String(e));
    useSync.setState({ status: err.kind === 'network' ? 'offline' : 'error', error: err.message });
  }
}

// ---------- Konto ----------

/**
 * Erster Start eines Kontos auf diesem Gerät (lokale Datenbank leer): Stand vom Server übernehmen.
 * Liefert false, wenn das Konto noch keine Daten hat (neues Konto). Braucht eine Verbindung.
 */
export async function adoptServerState(): Promise<boolean> {
  const remote = await fetchRemote();
  if (!remote.data) return false;
  await writeLocally(remote.data);
  await saveMeta({ revision: remote.revision, dirty: false, resetPending: false, deleted: remote.data.deleted, lastSyncAt: new Date().toISOString() });
  return true;
}

/** Führt einen Stand (z. B. alte Daten dieses Geräts) mit den eigenen zusammen und sichert ihn. */
export async function importSnapshot(snap: Snapshot): Promise<void> {
  const local = await readSnapshot(db, getMeta().deleted);
  const merged = mergeSnapshots(local, { ...snap, deleted: [] });
  await applyLocally(merged);
  await saveMeta({ dirty: true });
  if (syncEnabled()) scheduleSync(500);
}

/** Nach „Alle Daten löschen“ oder Import: Serverstand beim nächsten Abgleich ersetzen. */
export async function markReset() {
  await saveMeta({ resetPending: true, dirty: true, deleted: [] });
  if (syncEnabled()) scheduleSync(500);
}

// ---------- Start ----------

let started = false;

/** Lädt den Sync-Zustand, fordert dauerhaften Speicher an und startet den Abgleich. */
export async function initSync() {
  const row = await db.meta.get(META_KEY);
  if (row?.value) useSync.setState({ meta: { ...initialMeta, ...(row.value as SyncMeta) } });
  useSync.setState({ status: syncEnabled() ? 'idle' : 'off' });
  void requestPersistence();
  if (started || IS_PREVIEW) return;
  started = true;
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    // beim Verlassen sofort sichern, beim Zurückkehren Änderungen anderer Geräte holen
    window.clearTimeout(timer);
    void syncNow();
  });
  window.addEventListener('pagehide', () => {
    window.clearTimeout(timer);
    void syncNow();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 5 * 60 * 1000);
  void syncNow();
}

/** Bittet den Browser, die Daten nicht bei Speicherknappheit zu löschen. */
export async function requestPersistence(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;
  try {
    const already = await navigator.storage.persisted();
    const persisted = already || (await navigator.storage.persist());
    useSync.setState({ persisted });
    return persisted;
  } catch {
    return undefined;
  }
}
