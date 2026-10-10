import { create } from 'zustand';
import { db } from '../db/db';
import { fingerprint, isSnapshot, mergeSnapshots, readSnapshot, type Snapshot } from './snapshot';
import { onLocalChange, withoutTracking } from './tracking';
import { IS_PREVIEW } from '../env';

/**
 * Abgleich mit einem eigenen Server (z. B. Webspace bei all-inkl mit api/sync.php).
 * Der Browser bleibt die Hauptdatenquelle; der Server hält eine Kopie und eine Tageshistorie.
 */

export const DEFAULT_SYNC_URL = 'api/sync.php';
const META_KEY = 'sync';

export interface SyncConfig {
  enabled: boolean;
  url: string;
  key: string;
}

interface SyncMeta {
  config: SyncConfig;
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

const initialMeta: SyncMeta = { config: { enabled: false, url: DEFAULT_SYNC_URL, key: '' }, revision: 0, dirty: false, deleted: [] };

export const useSync = create<SyncState>(() => ({ meta: initialMeta, status: 'off' }));

const getMeta = () => useSync.getState().meta;

async function saveMeta(patch: Partial<SyncMeta>) {
  const meta = { ...getMeta(), ...patch };
  useSync.setState({ meta });
  await db.meta.put({ key: META_KEY, value: meta });
}

export class SyncError extends Error {
  constructor(
    public kind: 'auth' | 'config' | 'network' | 'server' | 'conflict' | 'format',
    message: string,
    public remote?: RemoteInfo,
  ) {
    super(message);
  }
}

function resolveUrl(url: string): string {
  return new URL(url || DEFAULT_SYNC_URL, document.baseURI).href;
}

async function request(config: Pick<SyncConfig, 'url' | 'key'>, init: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(resolveUrl(config.url), {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Key': config.key, ...(init.headers ?? {}) },
    });
  } catch {
    throw new SyncError('network', 'Server nicht erreichbar. Die Daten bleiben auf dem Gerät und werden später gesichert.');
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Antwort ohne JSON, z. B. HTML-Fehlerseite oder PHP nicht ausgeführt
    throw new SyncError('config', `Unerwartete Antwort vom Server (HTTP ${res.status}). Liegt api/sync.php auf dem Webspace und ist PHP aktiv?`);
  }
  if (res.status === 401) throw new SyncError('auth', 'Der Schlüssel passt nicht zu dem in api/config.php.');
  if (res.status === 503) throw new SyncError('config', 'Auf dem Server fehlt api/config.php mit dem Schlüssel.');
  if (res.status === 409) throw new SyncError('conflict', 'Der Serverstand hat sich zwischenzeitlich geändert.', toRemote(body));
  if (res.status === 413) throw new SyncError('server', 'Die Daten sind zu groß für den Server.');
  if (!res.ok) throw new SyncError('server', `Serverfehler (HTTP ${res.status}).`);
  return body;
}

function toRemote(body: unknown): RemoteInfo {
  const o = (body ?? {}) as Record<string, unknown>;
  const data = o.data ?? null;
  if (data !== null && !isSnapshot(data)) throw new SyncError('format', 'Die Daten auf dem Server sind beschädigt.');
  return { revision: typeof o.revision === 'number' ? o.revision : 0, savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined, data };
}

export async function fetchRemote(config: Pick<SyncConfig, 'url' | 'key'>): Promise<RemoteInfo> {
  return toRemote(await request(config));
}

async function pushRemote(config: SyncConfig, data: Snapshot, baseRevision: number, force = false): Promise<number> {
  const body = (await request(config, { method: 'PUT', body: JSON.stringify({ baseRevision, force, data }) })) as { revision?: number };
  if (typeof body?.revision !== 'number') throw new SyncError('format', 'Ungültige Antwort beim Speichern.');
  return body.revision;
}

/** Spielt einen Stand lokal ein und lädt die Stores neu. */
async function applyLocally(snap: Snapshot) {
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
  const { loadAll } = await import('../stores/data');
  await loadAll();
}

// ---------- Änderungen verfolgen ----------

let changeSeq = 0;
let timer: number | undefined;
let metaTimer: number | undefined;

export function scheduleSync(delayMs = 4000) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delayMs);
}

onLocalChange(({ deleted }) => {
  changeSeq++;
  const meta = getMeta();
  const next: Partial<SyncMeta> = { dirty: true };
  if (deleted && !meta.deleted.includes(deleted)) next.deleted = [...meta.deleted, deleted];
  useSync.setState({ meta: { ...meta, ...next } });
  // Metadaten gebündelt speichern
  window.clearTimeout(metaTimer);
  metaTimer = window.setTimeout(() => void saveMeta({}), 300);
  if (getMeta().config.enabled) scheduleSync();
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

async function runSync() {
  const { config } = getMeta();
  if (!config.enabled || !config.key) {
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
        const revision = await pushRemote(config, { ...local, deleted: [] }, meta.revision, true);
        await saveMeta({ revision, resetPending: false, deleted: [], lastSyncAt: new Date().toISOString(), dirty: changeSeq !== seq });
        break;
      }

      const remote = await fetchRemote(config);
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
          revision = await pushRemote(config, local, revision);
        } catch (e) {
          if (e instanceof SyncError && e.kind === 'conflict') continue; // erneut holen und zusammenführen
          throw e;
        }
      }
      await saveMeta({ revision, lastSyncAt: new Date().toISOString(), dirty: changeSeq !== seq });
      break;
    }
    useSync.setState({ status: 'ok' });
    if (getMeta().dirty) scheduleSync(1000);
  } catch (e) {
    const err = e instanceof SyncError ? e : new SyncError('server', String(e));
    useSync.setState({ status: err.kind === 'network' ? 'offline' : 'error', error: err.message });
  }
}

// ---------- Einrichtung ----------

/** Verbindung herstellen. `mode` legt fest, was beim ersten Abgleich passiert. */
export async function connect(config: Pick<SyncConfig, 'url' | 'key'>, mode: 'upload' | 'download' | 'merge', remote?: RemoteInfo) {
  const full: SyncConfig = { ...config, enabled: true };
  if (mode === 'upload') {
    const local = await readSnapshot(db, getMeta().deleted);
    const revision = await pushRemote(full, local, remote?.revision ?? 0, true);
    await saveMeta({ config: full, revision, dirty: false, resetPending: false, lastSyncAt: new Date().toISOString() });
  } else if (mode === 'download') {
    const r = remote ?? (await fetchRemote(full));
    if (r.data) await applyLocally(r.data);
    await saveMeta({ config: full, revision: r.revision, dirty: false, resetPending: false, deleted: r.data?.deleted ?? [], lastSyncAt: new Date().toISOString() });
  } else {
    // Revision -1 erzwingt Holen und Zusammenführen
    await saveMeta({ config: full, revision: -1, dirty: true, resetPending: false });
  }
  useSync.setState({ status: 'ok', error: undefined });
  await syncNow();
}

export async function disconnect() {
  await saveMeta({ config: { ...getMeta().config, enabled: false, key: '' } });
  useSync.setState({ status: 'off', error: undefined });
}

/** Nach „Alle Daten löschen“ oder Import: Serverstand beim nächsten Abgleich ersetzen. */
export async function markReset() {
  await saveMeta({ resetPending: true, dirty: true, deleted: [] });
  if (getMeta().config.enabled) scheduleSync(500);
}

/** Erzeugt einen zufälligen Schlüssel für api/config.php. */
export function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function configPhp(key: string): string {
  return `<?php\n// ATHLETIC Server-Sicherung: geheimer Schlüssel\ndefine('SYNC_KEY', '${key}');\n`;
}

// ---------- Start ----------

let started = false;

/** Lädt den Sync-Zustand, fordert dauerhaften Speicher an und startet den Abgleich. */
export async function initSync() {
  const row = await db.meta.get(META_KEY);
  if (row?.value) useSync.setState({ meta: { ...initialMeta, ...(row.value as SyncMeta) } });
  useSync.setState({ status: getMeta().config.enabled ? 'idle' : 'off' });
  void requestPersistence();
  if (started || IS_PREVIEW) return;
  started = true;
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    // beim Verlassen sichern, beim Zurückkehren Änderungen anderer Geräte holen
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
