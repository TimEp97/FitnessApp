import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { admin, useAuth, type AdminUser, type Invite } from '../auth/auth';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { DoubleConfirmSheet, Sheet } from '../components/Sheet';
import { fmtDateShort } from '../logic/format';
import s from './Admin.module.css';

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Unbekannter Fehler. Bitte versuche es erneut.');

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'noch nie');

/** Text kopieren oder (auf dem Handy) über das Teilen-Menü weitergeben. */
function ShareButtons({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <div className="row wrap">
      <button
        type="button"
        className="btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Icon name="copy" size={20} /> {copied ? 'Kopiert' : 'Kopieren'}
      </button>
      {canShare && (
        <button type="button" className="btn" onClick={() => void navigator.share({ title, text }).catch(() => {})}>
          <Icon name="upload" size={20} /> Teilen
        </button>
      )}
    </div>
  );
}

function inviteState(i: Invite): { text: string; open: boolean } {
  if (i.usedBy) return { text: `benutzt von ${i.usedBy} am ${fmtDateShort(i.usedAt!)}`, open: false };
  if (i.usedAt) return { text: 'benutzt (Konto gelöscht)', open: false };
  if (new Date(i.expiresAt).getTime() < Date.now()) return { text: 'abgelaufen', open: false };
  return { text: `offen bis ${fmtDateShort(i.expiresAt)}`, open: true };
}

export function Admin() {
  const me = useAuth((st) => st.user);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState<string>();
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<{ code: string; link: string } | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [u, i] = await Promise.all([admin.users(), admin.invites()]);
      setUsers(u);
      setInvites(i);
      setError(undefined);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const inviteMessage = (link: string, code: string) =>
    `Du bist zu ATHLETIC eingeladen, meiner Trainings-App. Registriere dich hier: ${link}\nEinladungscode: ${code} (14 Tage gültig, nur einmal nutzbar)`;

  return (
    <Page
      title="Nutzer verwalten"
      back={
        <Link to="/profil" className="btnLink">
          <Icon name="chevronLeft" size={20} /> Profil
        </Link>
      }
    >
      {error && (
        <p className="fieldError" role="alert">
          {error}
        </p>
      )}
      <div className="grid">
        <section className="card stack" aria-labelledby="invite-title">
          <h2 id="invite-title" className="h2">
            Einladen
          </h2>
          <p className="muted">Registrieren kann sich nur, wer einen Einladungscode hat. Jeder Code gilt 14 Tage und nur für ein Konto.</p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                setCreated(await admin.createInvite(note.trim()));
                setNote('');
              });
            }}
          >
            <div>
              <label className="fieldLabel" htmlFor="invite-note">
                Für wen? (optional)
              </label>
              <input id="invite-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="z. B. Max" />
            </div>
            <button type="submit" className="btn btnPrimary btnBlock" disabled={busy}>
              <Icon name="plus" size={20} /> Einladung erstellen
            </button>
          </form>
          {created && (
            <div className={s.created} role="status">
              <span className="label">Neuer Einladungscode</span>
              <b className={`num ${s.code}`} data-testid="invite-code">
                {created.code}
              </b>
              <p className="small muted">Schicke den Link oder den Code an die Person. Der Link füllt den Code beim Registrieren automatisch aus.</p>
              <ShareButtons title="Einladung zu ATHLETIC" text={inviteMessage(created.link, created.code)} />
            </div>
          )}
          {invites && invites.length > 0 && (
            <ul className="list" aria-label="Einladungen">
              {invites.map((i) => {
                const st = inviteState(i);
                return (
                  <li key={i.code} className="listRow">
                    <span className="spacer">
                      <b className="num">{i.code}</b>
                      {i.note && <span className="muted"> · {i.note}</span>}
                      <span className="muted small" style={{ display: 'block' }}>
                        {st.text}
                      </span>
                    </span>
                    {st.open && (
                      <button type="button" className="iconBtn iconBtnGhost btnDanger" aria-label={`Einladung ${i.code} löschen`} onClick={() => void act(() => admin.deleteInvite(i.code))}>
                        <Icon name="trash" size={20} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card stack" aria-labelledby="users-title">
          <h2 id="users-title" className="h2">
            Nutzer {users ? <span className="muted num">({users.length})</span> : null}
          </h2>
          <p className="muted">Du siehst nur die Konten, nicht die Trainingsdaten der anderen.</p>
          {users === null ? (
            <p className="muted">Wird geladen …</p>
          ) : (
            <ul className="list" data-testid="admin-users">
              {users.map((u) => (
                <li key={u.id}>
                  <button type="button" className={`listRow ${s.userRow}`} onClick={() => setSelected(u)} disabled={u.id === me?.id}>
                    <span className="spacer">
                      <b>{u.username}</b>
                      {u.role === 'admin' && <span className={s.badge}>Admin</span>}
                      {u.blocked && <span className={`${s.badge} ${s.blocked}`}>gesperrt</span>}
                      <span className="muted small" style={{ display: 'block' }}>
                        {u.email}
                      </span>
                      <span className="muted small" style={{ display: 'block' }}>
                        Zuletzt angemeldet: {fmtDate(u.lastLoginAt)} · gesichert: {fmtDate(u.lastSyncAt)}
                      </span>
                    </span>
                    {u.id !== me?.id && <Icon name="chevronRight" className="muted" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          setResetLink(null);
        }}
        title={selected?.username ?? ''}
      >
        {selected && (
          <div className="stack">
            <p className="muted">{selected.email}</p>
            {resetLink ? (
              <div className={s.created}>
                <span className="label">Link zum Zurücksetzen (60 Minuten gültig)</span>
                <p className={`small ${s.link}`}>{resetLink}</p>
                <ShareButtons title="Neues Passwort für ATHLETIC" text={`Hier kannst du ein neues Passwort für ATHLETIC festlegen (60 Minuten gültig): ${resetLink}`} />
              </div>
            ) : (
              <button type="button" className="btn btnBlock" disabled={busy} onClick={() => void act(async () => setResetLink(await admin.resetLink(selected.id)))}>
                <Icon name="lock" size={20} /> Link für neues Passwort erzeugen
              </button>
            )}
            <button
              type="button"
              className="btn btnBlock"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await admin.setBlocked(selected.id, !selected.blocked);
                  setSelected(null);
                })
              }
            >
              {selected.blocked ? 'Entsperren' : 'Sperren (meldet auf allen Geräten ab)'}
            </button>
            <button
              type="button"
              className="btn btnBlock btnDanger"
              onClick={() => {
                setToDelete(selected);
                setSelected(null);
              }}
            >
              <Icon name="trash" size={20} /> Konto löschen
            </button>
          </div>
        )}
      </Sheet>

      <DoubleConfirmSheet
        open={toDelete !== null}
        title={`${toDelete?.username ?? ''} löschen?`}
        message="Das Konto und alle Trainingsdaten dieser Person werden vom Server gelöscht."
        confirmLabel="Weiter"
        secondTitle="Wirklich löschen?"
        secondMessage="Das lässt sich nicht rückgängig machen."
        secondConfirmLabel="Ja, Konto löschen"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await act(() => admin.deleteUser(toDelete.id));
          setToDelete(null);
        }}
      />
    </Page>
  );
}
