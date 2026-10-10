import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { loadAll } from './stores/data';
import { useSettings } from './stores/settings';
import { useTheme } from './hooks/useTheme';
import { TabBar } from './components/TabBar';
import { RestTimer } from './components/RestTimer';
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
import s from './App.module.css';

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
        <Outlet />
      </main>
      <RestTimer />
    </div>
  );
}

export function App() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  useTheme();

  useEffect(() => {
    loadAll()
      .then(() => setState('ready'))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setState('error');
      });
  }, []);

  if (state === 'loading') {
    return (
      <div className={s.splash} aria-busy="true">
        <span className={s.logo}>ATHLETIC</span>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className={s.splash} role="alert">
        <span className={s.logo}>ATHLETIC</span>
        <p className="muted">Die lokale Datenbank konnte nicht geöffnet werden. Ist privates Surfen aktiv?</p>
        <p className="muted small">{error}</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
