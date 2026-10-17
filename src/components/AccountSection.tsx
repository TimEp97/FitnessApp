import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { changePassword, deleteAccount, isAdmin, logout, useAuth } from '../auth/auth';
import { syncNow, useSync } from '../sync/engine';
import { ConfirmSheet, Sheet } from './Sheet';
import { Icon } from './Icon';
import s from './AccountSection.module.css';

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Unbekannter Fehler. Bitte versuche es erneut.');

/** Konto im Profil: angemeldet als, Passwort ändern, abmelden, Konto löschen, Nutzerverwaltung für Admins. */
export function AccountSection() {
  const user = useAuth((st) => st.user);
  const [pwOpen, setPwOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  if (!user) return null;

  const tryLogout = async () => {
    setBusy(true);
    // vorher sichern, denn beim Abmelden werden die Daten dieses Kontos vom Gerät entfernt
    await syncNow();
    const { meta, status } = useSync.getState();
    setBusy(false);
    if (meta.dirty || status === 'error' || status === 'offline') setUnsavedOpen(true);
    else await logout();
  };

  return (
    <section id="konto" className="card stack" aria-labelledby="account-title">
      <h2 id="account-title" className="h2">
        Konto
      </h2>
      <div className={s.who}>
        <span className={s.avatar} aria-hidden="true">
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span className="spacer">
          <b data-testid="account-username">{user.username}</b>
          {isAdmin(user) && <span className={s.badge}>Admin</span>}
          <span className="muted small" style={{ display: 'block' }}>
            {user.email}
          </span>
        </span>
      </div>
      {message && (
        <p className="accentText" role="status">
          {message}
        </p>
      )}
      {isAdmin(user) && (
        <Link to="/admin" className="listRow">
          <Icon name="user" size={20} />
          <span className="spacer">Nutzer und Einladungen verwalten</span>
          <Icon name="chevronRight" className="muted" />
        </Link>
      )}
      <div className="row wrap">
        <button type="button" className="btn" onClick={() => setPwOpen(true)}>
          <Icon name="lock" size={20} /> Passwort ändern
        </button>
        <button type="button" className="btn" onClick={tryLogout} disabled={busy}>
          {busy ? 'Wird gesichert …' : 'Abmelden'}
        </button>
      </div>
      <button type="button" className="btn btnGhost btnDanger btnBlock" onClick={() => setDeleteStep(1)}>
        <Icon name="trash" size={20} /> Konto löschen
      </button>

      <PasswordSheet
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onDone={() => {
          setPwOpen(false);
          setMessage('Passwort geändert. Andere Geräte sind jetzt abgemeldet.');
        }}
      />

      <ConfirmSheet
        open={unsavedOpen}
        title="Nicht alles gesichert"
        message="Einige Änderungen konnten nicht auf dem Server gesichert werden (keine Verbindung?). Beim Abmelden werden sie von diesem Gerät gelöscht. Versuche es am besten mit Internet erneut."
        confirmLabel="Trotzdem abmelden"
        danger
        onClose={() => setUnsavedOpen(false)}
        onConfirm={() => void logout()}
      />

      <ConfirmSheet
        open={deleteStep === 1}
        title="Konto löschen?"
        message="Dein Konto und alle deine Trainings, Pläne, Statistiken und Körperwerte werden auf dem Server und auf diesem Gerät gelöscht. Exportiere vorher eine Sicherung, wenn du die Daten behalten willst."
        confirmLabel="Weiter"
        danger
        onClose={() => setDeleteStep(0)}
        onConfirm={() => setDeleteStep(2)}
      />
      <DeleteAccountSheet open={deleteStep === 2} onClose={() => setDeleteStep(0)} />
    </section>
  );
}

function PasswordSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Passwort ändern">
      <form className="stack" onSubmit={submit}>
        <div>
          <label className="fieldLabel" htmlFor="pw-current">
            Aktuelles Passwort
          </label>
          <input id="pw-current" className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </div>
        <div>
          <label className="fieldLabel" htmlFor="pw-next">
            Neues Passwort
          </label>
          <input id="pw-next" className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          <p className="notice">Mindestens 10 Zeichen. Andere Geräte werden danach abgemeldet.</p>
        </div>
        {error && (
          <p className="fieldError" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btnPrimary btnBlock btnLg" disabled={busy}>
          Passwort speichern
        </button>
      </form>
    </Sheet>
  );
}

/** Zweite Rückfrage: mit Passwort bestätigen. Abbrechen steht oben, damit ein doppelter Tipp nichts löscht. */
function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await deleteAccount(password);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Wirklich endgültig löschen?">
      <form className="stack" onSubmit={submit}>
        <p className="muted">Das lässt sich nicht rückgängig machen. Gib zur Bestätigung dein Passwort ein.</p>
        <button type="button" className="btn btnBlock btnLg" data-autofocus onClick={onClose}>
          Abbrechen
        </button>
        <div>
          <label className="fieldLabel" htmlFor="delete-pw">
            Passwort
          </label>
          <input id="delete-pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && (
          <p className="fieldError" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btnBlock btnDanger" disabled={busy || !password}>
          {busy ? 'Wird gelöscht …' : 'Konto endgültig löschen'}
        </button>
      </form>
    </Sheet>
  );
}
