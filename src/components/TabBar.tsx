import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { useWorkouts } from '../stores/workouts';
import s from './TabBar.module.css';

const TABS: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', match: (p) => p === '/' },
  { to: '/training', label: 'Training', icon: 'dumbbell', match: (p) => p.startsWith('/training') || p.startsWith('/workout') },
  { to: '/muskeln', label: 'Muskeln', icon: 'body', match: (p) => p.startsWith('/muskeln') },
  { to: '/fortschritt', label: 'Fortschritt', icon: 'chart', match: (p) => p.startsWith('/fortschritt') },
  { to: '/profil', label: 'Profil', icon: 'user', match: (p) => p.startsWith('/profil') || p.startsWith('/uebungen') },
];

export function TabBar() {
  const { pathname } = useLocation();
  const running = useWorkouts((st) => Boolean(st.active));
  return (
    <nav className={s.bar} aria-label="Hauptnavigation">
      {TABS.map((t) => {
        // Läuft ein Workout, führt „Training“ direkt dorthin.
        const to = t.to === '/training' && running ? '/workout' : t.to;
        const active = t.match(pathname);
        return (
          <NavLink key={t.to} to={to} className={s.tab} aria-current={active ? 'page' : undefined} data-active={active}>
            <span className={s.iconWrap}>
              <Icon name={t.icon} size={24} />
              {t.to === '/training' && running && <span className={s.dot} aria-label="Workout läuft" />}
            </span>
            <span className={s.label}>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
