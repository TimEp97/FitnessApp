import { useState } from 'react';
import { useSync, connect, configPhp, disconnect, fetchRemote, generateKey, syncNow, DEFAULT_SYNC_URL, SyncError, type RemoteInfo } from '../sync/engine';
import { useSettings } from '../stores/settings';
import { useWorkouts } from '../stores/workouts';
import { useNow } from '../hooks/useNow';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { IS_PREVIEW } from '../env';
import s from './SyncSection.module.css';

function ago(iso: string | undefined, now: number): string {
  if (!iso) return 'noch nie';
  const min = Math.round((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} h`;
  return new Date(iso).toLocaleDateString('de-DE');
}

/** Server-Sicherung auf dem eigenen Webspace (z. B. all-inkl) und Status des Browser-Speichers. */
export function SyncSection() {
  const { meta, status, error, persisted } = useSync();
  const hasSample = useSettings((st) => st.settings.hasSampleData);
  const localWorkouts = useWorkouts((st) => st.workouts.length);
  const now = useNow(30000);
  const [url, setUrl] = useState(meta.config.url || DEFAULT_SYNC_URL);
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [remote, setRemote] = useState<RemoteInfo | null>(null);

  const enabled = meta.config.enabled;
  const preferDownload = hasSample || localWorkouts === 0;

  const tryConnect = async () => {
    setFormError(undefined);
    if (key.trim().length < 24) {
      setFormError('Der Schlüssel muss mindestens 24 Zeichen lang sein.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetchRemote({ url, key: key.trim() });
      if (!r.data) await connect({ url, key: key.trim() }, 'upload', r);
      else setRemote(r);
    } catch (e) {
      setFormError(e instanceof SyncError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (mode: 'upload' | 'download' | 'merge') => {
    if (!remote) return;
    setBusy(true);
    try {
      await connect({ url, key: key.trim() }, mode, remote);
    } catch (e) {
      setFormError(e instanceof SyncError ? e.message : String(e));
    } finally {
      setRemote(null);
      setBusy(false);
    }
  };

  const statusText: Record<typeof status, string> = {
    off: 'Aus',
    idle: 'Bereit',
    syncing: 'Wird gesichert …',
    ok: meta.dirty ? 'Änderungen werden gleich gesichert' : `Gesichert ${ago(meta.lastSyncAt, now)}`,
    offline: 'Offline – wird automatisch nachgeholt',
    error: error ?? 'Fehler beim Sichern',
  };

  return (
    <section id="sicherung" className="card stack" aria-labelledby="sync-title">
      <h2 id="sync-title" className="h2">
        Speicherung und Sicherung
      </h2>

      <div className={s.storage}>
        <Icon name={persisted ? 'check' : 'info'} size={20} />
        <p>
          {persisted
            ? 'Dauerhafter Speicher aktiv: Der Browser löscht deine Daten nicht von selbst.'
            : 'Der Browser hat keinen dauerhaften Speicher zugesagt. Installiere ATHLETIC auf dem Home-Bildschirm und richte die Server-Sicherung ein, damit deine Historie sicher ist.'}
        </p>
      </div>

      {IS_PREVIEW ? (
        <p className="muted">
          Die Server-Sicherung funktioniert, sobald ATHLETIC auf deinem eigenen Webspace läuft (z. B. all-inkl, siehe README). In dieser Vorschau
          bleiben die Daten nur in diesem Browser.
        </p>
      ) : enabled ? (
        <div className="stack" data-testid="sync-enabled">
          <div className={s.statusRow} role="status">
            <span className={`${s.dot} ${s[status]}`} aria-hidden="true" />
            <span className="spacer">
              <b>Server-Sicherung aktiv</b>
              <span className="muted small" style={{ display: 'block' }} data-testid="sync-status">
                {statusText[status]}
              </span>
            </span>
          </div>
          <p className="notice">
            Jede Änderung wird automatisch auf deinem Server gesichert ({meta.config.url}). Dort entsteht zusätzlich jeden Tag eine Kopie als
            Historie. Verbinde weitere Geräte mit demselben Schlüssel, um die Daten dort zu nutzen.
          </p>
          <div className="row wrap">
            <button type="button" className="btn" onClick={() => void syncNow()} disabled={status === 'syncing'}>
              <Icon name="upload" size={20} /> Jetzt sichern
            </button>
            <button type="button" className="btn btnGhost" onClick={() => void disconnect()}>
              Trennen
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">
            Sichere deine Historie automatisch auf deinem eigenen Webspace, z. B. bei all-inkl. Dann bleiben die Daten erhalten, auch wenn der
            Browser-Speicher gelöscht wird oder du das Gerät wechselst.
          </p>
          <div>
            <label className="fieldLabel" htmlFor="sync-url">
              Adresse der Sicherung
            </label>
            <input id="sync-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" spellCheck={false} />
            <p className="notice">Standard: api/sync.php neben der App. Nur ändern, wenn die Datei woanders liegt.</p>
          </div>
          <div>
            <label className="fieldLabel" htmlFor="sync-key">
              Schlüssel
            </label>
            <div className="row">
              <input
                id="sync-key"
                className="input"
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setGenerated(false);
                }}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'sync-err' : undefined}
              />
              <button type="button" className="iconBtn" aria-pressed={showKey} aria-label="Schlüssel anzeigen" onClick={() => setShowKey(!showKey)}>
                <Icon name="search" size={20} />
              </button>
            </div>
            {formError && (
              <p id="sync-err" className="fieldError" role="alert">
                {formError}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btnBlock"
            onClick={() => {
              setKey(generateKey());
              setShowKey(true);
              setGenerated(true);
              setCopied(false);
            }}
          >
            Neuen Schlüssel erzeugen (erste Einrichtung)
          </button>
          {generated && (
            <div className={s.snippet}>
              <p className="small">
                Lege auf dem Webspace im Ordner <code>api</code> die Datei <code>config.php</code> mit diesem Inhalt an. Bewahre den Schlüssel gut
                auf, du brauchst ihn auf jedem Gerät.
              </p>
              <pre data-testid="config-snippet">{configPhp(key)}</pre>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(configPhp(key));
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <Icon name="copy" size={20} /> {copied ? 'Kopiert' : 'Inhalt kopieren'}
              </button>
            </div>
          )}
          <button type="button" className="btn btnBlock" onClick={tryConnect} disabled={busy}>
            {busy ? 'Verbinde …' : 'Verbinden'}
          </button>
        </div>
      )}

      <Sheet open={Boolean(remote)} onClose={() => setRemote(null)} title="Sicherung gefunden">
        {remote?.data && (
          <>
            <p className="muted">
              Auf dem Server liegt eine Sicherung
              {remote.savedAt ? ` vom ${new Date(remote.savedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}` : ''} mit{' '}
              {remote.data.workouts.filter((w) => w.finishedAt).length} Workouts. Auf diesem Gerät sind {localWorkouts} Workouts
              {hasSample ? ' (Beispieldaten)' : ''}.
            </p>
            <button type="button" className={`btn btnBlock btnLg ${preferDownload ? 'btnPrimary' : ''}`} onClick={() => choose('download')} disabled={busy}>
              Serverdaten übernehmen
            </button>
            <p className="notice">Ersetzt die Daten auf diesem Gerät. Richtig für ein neues Gerät.</p>
            <button type="button" className={`btn btnBlock btnLg ${preferDownload ? '' : 'btnPrimary'}`} onClick={() => choose('merge')} disabled={busy}>
              Zusammenführen
            </button>
            <p className="notice">Behält beides. Gleiche Einträge werden nach dem neueren Stand abgeglichen.</p>
            <button type="button" className="btn btnBlock btnDanger" onClick={() => choose('upload')} disabled={busy}>
              Server mit diesem Gerät überschreiben
            </button>
          </>
        )}
      </Sheet>
    </section>
  );
}
