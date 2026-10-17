import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { fetchStatus, login, register, requestPasswordReset, resetPassword, setupAdmin, useAuth } from '../auth/auth';
import { legacySyncKey } from '../auth/legacy';
import s from './Auth.module.css';

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Unbekannter Fehler. Bitte versuche es erneut.');

function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className={s.wrap}>
      <header className={s.top}>
        <span className={s.brand}>ATHLETIC</span>
      </header>
      <main className={s.main}>
        <h1 className="h1">{title}</h1>
        {intro && <div className={`muted ${s.intro}`}>{intro}</div>}
        {children}
      </main>
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
  autoFocus?: boolean;
  inputMode?: 'email' | 'text';
}) {
  return (
    <div>
      <label className="fieldLabel" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        className="input"
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode={props.inputMode}
        autoFocus={props.autoFocus}
        required
      />
      {props.hint && <p className="notice">{props.hint}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="fieldLabel" htmlFor={id}>
        {label}
      </label>
      <div className={s.pwRow}>
        <input
          id={id}
          className="input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <button type="button" className="btn" aria-pressed={show} onClick={() => setShow(!show)}>
          {show ? 'Verbergen' : 'Anzeigen'}
        </button>
      </div>
      {hint && <p className="notice">{hint}</p>}
    </div>
  );
}

/** Formular mit Fehlerzeile und Sende-Knopf; `onSubmit` wirft bei Fehlern. */
function AuthForm({ submitLabel, onSubmit, children }: { submitLabel: string; onSubmit: () => Promise<void>; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stackLg" onSubmit={submit} noValidate>
      {children}
      {error && (
        <p className="fieldError" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btnPrimary btnBlock btnLg" disabled={busy}>
        {busy ? 'Bitte warten …' : submitLabel}
      </button>
    </form>
  );
}

const PASSWORD_HINT = 'Mindestens 10 Zeichen.';
const USERNAME_HINT = '3 bis 24 Zeichen: Buchstaben, Ziffern, Punkt, Binde- und Unterstrich.';

export function LoginPage() {
  const navigate = useNavigate();
  const expiredUser = useAuth((st) => (st.expired ? st.user : null));
  const [name, setName] = useState(expiredUser?.username ?? '');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (expiredUser) return;
    fetchStatus()
      .then((st) => st.setupNeeded && navigate('/einrichten', { replace: true }))
      .catch(() => {});
  }, [expiredUser, navigate]);

  return (
    <AuthShell
      title="Anmelden"
      intro={expiredUser ? 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an, deine Daten auf diesem Gerät bleiben erhalten.' : 'Melde dich mit deinem Benutzernamen oder deiner E-Mail-Adresse an.'}
    >
      <AuthForm submitLabel="Anmelden" onSubmit={() => login(name, password)}>
        <Field id="login" label="Benutzername oder E-Mail" value={name} onChange={setName} autoComplete="username" autoFocus={!name} />
        <PasswordField id="password" label="Passwort" value={password} onChange={setPassword} autoComplete="current-password" />
      </AuthForm>
      <div className={s.links}>
        <Link to="/passwort-vergessen" className="btnLink">
          Passwort vergessen?
        </Link>
        {!expiredUser && (
          <Link to="/registrieren" className="btnLink">
            Mit Einladungscode registrieren
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

function RegisterPage() {
  const { code: codeParam } = useParams();
  const [invite, setInvite] = useState(codeParam ?? '');
  // Einladungslink geöffnet, während das Formular schon offen war
  useEffect(() => {
    if (codeParam) setInvite(codeParam);
  }, [codeParam]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthShell title="Registrieren" intro="Für ein Konto brauchst du einen Einladungscode. Du bekommst ihn vom Betreiber der App.">
      <AuthForm submitLabel="Konto anlegen" onSubmit={() => register({ invite, username: username.trim(), email: email.trim(), password })}>
        <Field id="invite" label="Einladungscode" value={invite} onChange={setInvite} autoComplete="off" hint="z. B. ABCD-EFGH-JKLM" autoFocus={!invite} />
        <Field id="username" label="Benutzername" value={username} onChange={setUsername} autoComplete="username" hint={USERNAME_HINT} autoFocus={Boolean(invite)} />
        <Field id="email" label="E-Mail" type="email" inputMode="email" value={email} onChange={setEmail} autoComplete="email" hint="Für „Passwort vergessen“. Wird nicht weitergegeben." />
        <PasswordField id="password" label="Passwort" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
      </AuthForm>
      <div className={s.links}>
        <Link to="/" className="btnLink">
          Ich habe schon ein Konto
        </Link>
      </div>
    </AuthShell>
  );
}

function ForgotPage() {
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="Passwort vergessen" intro="Gib deinen Benutzernamen oder deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.">
      {sent ? (
        <p className={s.success} role="status">
          Falls es ein Konto dazu gibt, ist jetzt eine E-Mail unterwegs. Der Link ist 60 Minuten gültig. Schau auch im Spam-Ordner nach.
        </p>
      ) : (
        <AuthForm
          submitLabel="Link anfordern"
          onSubmit={async () => {
            await requestPasswordReset(name);
            setSent(true);
          }}
        >
          <Field id="login" label="Benutzername oder E-Mail" value={name} onChange={setName} autoComplete="username" autoFocus />
        </AuthForm>
      )}
      <div className={s.links}>
        <Link to="/" className="btnLink">
          Zurück zur Anmeldung
        </Link>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const loggedIn = useAuth((st) => Boolean(st.user) && !st.expired);
  return (
    <AuthShell title="Neues Passwort" intro={done ? undefined : 'Lege ein neues Passwort für dein Konto fest. Danach bist du auf allen Geräten abgemeldet.'}>
      {done ? (
        <>
          <p className={s.success} role="status">
            Dein Passwort ist geändert. Melde dich jetzt mit dem neuen Passwort an.
          </p>
          <Link to="/" className="btn btnPrimary btnBlock btnLg" onClick={() => loggedIn && useAuth.setState({ expired: true })}>
            Zur Anmeldung
          </Link>
        </>
      ) : (
        <AuthForm
          submitLabel="Passwort speichern"
          onSubmit={async () => {
            await resetPassword(token, password);
            setDone(true);
          }}
        >
          <PasswordField id="password" label="Neues Passwort" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
        </AuthForm>
      )}
    </AuthShell>
  );
}

function SetupPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [codeFromDevice, setCodeFromDevice] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    void legacySyncKey().then((key) => {
      if (!key) return;
      setCode(key);
      setCodeFromDevice(true);
    });
    fetchStatus()
      .then((st) => !st.setupNeeded && navigate('/', { replace: true }))
      .catch(() => {});
  }, [navigate]);

  return (
    <AuthShell
      title="Admin-Konto anlegen"
      intro="Auf diesem Server gibt es noch kein Konto. Lege dein eigenes Konto als Admin an. Die bisher auf dem Server gesicherten Trainingsdaten werden in dein Konto übernommen. Danach kannst du andere Personen einladen."
    >
      <AuthForm submitLabel="Admin-Konto anlegen" onSubmit={() => setupAdmin({ code, username: username.trim(), email: email.trim(), password })}>
        <Field id="username" label="Benutzername" value={username} onChange={setUsername} autoComplete="username" hint={USERNAME_HINT} autoFocus />
        <Field id="email" label="E-Mail" type="email" inputMode="email" value={email} onChange={setEmail} autoComplete="email" />
        <PasswordField id="password" label="Passwort" value={password} onChange={setPassword} autoComplete="new-password" hint={PASSWORD_HINT} />
        <PasswordField
          id="setup-code"
          label="Einrichtungscode"
          value={code}
          onChange={(v) => {
            setCode(v);
            setCodeFromDevice(false);
          }}
          autoComplete="off"
          hint={
            codeFromDevice
              ? 'Aus der bisherigen Server-Sicherung auf diesem Gerät übernommen.'
              : 'Steht in api/config.php auf dem Webspace (SETUP_CODE, bei älteren Installationen SYNC_KEY).'
          }
        />
      </AuthForm>
    </AuthShell>
  );
}

/** Bildschirme ohne Anmeldung. */
export function AuthRoutes() {
  return (
    <Routes>
      <Route index element={<LoginPage />} />
      <Route path="registrieren" element={<RegisterPage />} />
      <Route path="registrieren/:code" element={<RegisterPage />} />
      <Route path="passwort-vergessen" element={<ForgotPage />} />
      <Route path="passwort-neu/:token" element={<ResetPasswordPage />} />
      <Route path="einrichten" element={<SetupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
