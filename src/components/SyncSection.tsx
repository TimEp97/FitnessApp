import { useSync, syncNow } from '../sync/engine';
import { useNow } from '../hooks/useNow';
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

/** Status der Server-Sicherung des eigenen Kontos und des Browser-Speichers. */
export function SyncSection() {
  const { meta, status, error, persisted } = useSync();
  const now = useNow(30000);

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
            : 'Der Browser hat keinen dauerhaften Speicher zugesagt. Installiere ATHLETIC auf dem Home-Bildschirm. Deine Daten sind zusätzlich auf dem Server gesichert.'}
        </p>
      </div>

      {IS_PREVIEW ? (
        <p className="muted">In dieser Vorschau bleiben die Daten nur in diesem Browser. Auf dem eigenen Webspace werden sie pro Konto auf dem Server gesichert.</p>
      ) : (
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
            Jede Änderung wird automatisch in deinem Konto auf dem Server gesichert, dort entsteht zusätzlich jeden Tag eine Kopie. Melde dich auf
            weiteren Geräten mit demselben Konto an, um die Daten dort zu nutzen.
          </p>
          <button type="button" className="btn" onClick={() => void syncNow()} disabled={status === 'syncing'}>
            <Icon name="upload" size={20} /> Jetzt sichern
          </button>
        </div>
      )}
    </section>
  );
}
