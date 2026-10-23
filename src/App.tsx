import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, MemoryRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { loadAll } from './stores/data';
import { adoptServerState, initSync } from './sync/engine';
import { IS_PREVIEW } from './env';
import { LEGACY_DB, db, isMemoryDb, openDatabase, userDbName } from './db/db';
import { refreshMe, useAuth } from './auth/auth';
import { useSettings } from './stores/settings';
import { useTheme } from './hooks/useTheme';
import { TabBar } from './components/TabBar';
import { RestTimer } from './components/RestTimer';
import { LegacyImport } from './components/LegacyImport';
import { Home } from './pages/Home';
import { Training } from './pages/Training';
import { PlanEdit } from './pages/PlanEdit';
import { WorkoutPage } from './pages/Workout';
import { Summary } from './pages/Summary';
import { Muscles } from './pages/Muscles';
import { Progress } from './pages/Progress';
import { Exercises } from './pages/Exercises';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Profile } from './pages/Profile';
import { Onboarding } from './pages/Onboarding';
import { Admin } from './pages/Admin';
import { AuthRoutes, LoginPage, ResetPasswordPage } from './pages/Auth';
import s from './App.module.css';

// Die Vorschau läuft in einem eingebetteten Rahmen ohne eigene Adresszeile.
const Router = IS_PREVIEW ? MemoryRouter : HashRouter;

function Layout() {
  const done = useSettings((st) => st.settings.onboardingDone);
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  if (!done) return <Navigate to="/onboarding" replace />;
  return (
    <div className={s.shell}>
      <button type="button" className={s.skip} onClick={() => document.getElementById('main')?.focus()}>
        Zum Inhalt springen
      </button>
      <TabBar />
      <main id="main" className={s.main} tabIndex={-1}>
        {isMemoryDb && (
          <p className={s.memory} role="status">
            Dieser Browser erlaubt keinen dauerhaften Speicher (z. B. privates Surfen). Änderungen gehen beim Schließen verloren.
          </p>
        )}
        <Outlet />
      </main>
      <RestTimer />
    </div>
  );
}

function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className={s.splash} aria-busy={!children} role={children ? 'alert' : undefined}>
      <span className={s.logo}>ATHLETIC</span>
      {children}
    </div>
  );
}

/** Öffnet die Datenbank des Kontos; auf einem neuen Gerät zuerst mit dem Stand vom Server. */
async function openUserData(userId: number): Promise<void> {
  await openDatabase(userDbName(userId));
  const isNew = !(await db.settings.get('settings'));
  if (isNew) await adoptServerState();
  await loadAll();
}

function DataApp({ userId }: { userId: number | null }) {
  const isAdmin = useAuth((st) => st.user?.role === 'admin');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const start = useCallback(() => {
    setState('loading');
    (userId !== null ? openUserData(userId) : loadAll(LEGACY_DB))
      .then(() => {
        setState('ready');
        void initSync();
        if (userId !== null) void refreshMe();
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setState('error');
      });
  }, [userId]);

  useEffect(start, [start]);

  if (state === 'loading') return <Splash />;
  if (state === 'error') {
    return (
      <Splash>
        <p className="muted">
          {userId !== null
            ? 'Deine Daten konnten nicht geladen werden. Beim ersten Start auf einem Gerät braucht ATHLETIC eine Internetverbindung.'
            : 'Die lokale Datenbank konnte nicht geöffnet werden. Ist privates Surfen aktiv?'}
        </p>
        <p className="muted small">{error}</p>
        <button type="button" className="btn btnPrimary" onClick={start}>
          Erneut versuchen
        </button>
      </Splash>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/passwort-neu/:token" element={<ResetPasswordPage />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="training" element={<Training />} />
          <Route path="training/plan/:id" element={<PlanEdit />} />
          <Route path="workout" element={<WorkoutPage />} />
          <Route path="workout/zusammenfassung/:id" element={<Summary />} />
          <Route path="muskeln" element={<Muscles />} />
          <Route path="fortschritt" element={<Progress />} />
          <Route path="uebungen" element={<Exercises />} />
          <Route path="uebungen/:id" element={<ExerciseDetail />} />
          <Route path="profil" element={<Profile />} />
          {isAdmin && <Route path="admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {userId !== null && <LegacyImport userId={userId} />}
    </Router>
  );
}

export function App() {
  useTheme();
  const user = useAuth((st) => st.user);
  const expired = useAuth((st) => st.expired);

  // Vorschau: ohne Server und ohne Konto, Daten nur im Browser
  if (IS_PREVIEW) return <DataApp userId={null} />;

  if (!user) {
    return (
      <Router>
        <AuthRoutes />
      </Router>
    );
  }
  // Anmeldung abgelaufen: Adresse bleibt stehen, nach dem Anmelden geht es dort weiter (z. B. im Workout)
  if (expired) {
    return (
      <Router>
        <LoginPage />
      </Router>
    );
  }
  // key: beim Wechsel des Kontos alles neu laden
  return <DataApp key={user.id} userId={user.id} />;
}
