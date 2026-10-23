import { Link } from 'react-router-dom';
import { useSettings } from '../stores/settings';
import { useWorkouts } from '../stores/workouts';
import { useExercises } from '../stores/exercises';
import { useActivePlan } from '../stores/plans';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { BarChart, type Bar } from '../components/charts/BarChart';
import { useStartWorkout } from '../hooks/useStartWorkout';
import { addDays, startOfDay, startOfWeek } from '../logic/dates';
import { daySetCount, dayMuscleGroups, estimateMinutes, nextPlanDay, plannedWeekdays } from '../logic/planning';
import { latestRecord, RECORD_LABEL, streakWeeks, workoutDurationMs, workoutsBetween, workoutVolume } from '../logic/metrics';
import { fmtDateLong, fmtDateShort, fmtNumber, fmtVolume, fmtWeight } from '../logic/format';
import s from './Home.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export function Home() {
  const settings = useSettings((st) => st.settings);
  const workouts = useWorkouts((st) => st.workouts);
  const active = useWorkouts((st) => st.active);
  const byId = useExercises((st) => st.byId);
  const plan = useActivePlan();
  const start = useStartWorkout();

  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);
  const week = workoutsBetween(workouts, weekStart, addDays(weekStart, 7));
  const minutes = week.reduce((sum, w) => sum + workoutDurationMs(w), 0) / 60000;
  const volume = week.reduce((sum, w) => sum + workoutVolume(w), 0);
  const streak = streakWeeks(workouts, now);
  const record = latestRecord(workouts);
  const day = nextPlanDay(plan, workouts);
  const planned = plannedWeekdays(settings.daysPerWeek);

  const bars: Bar[] = WEEKDAYS.map((label, i) => {
    const date = addDays(weekStart, i);
    const ws = workoutsBetween(workouts, date, addDays(date, 1));
    const min = ws.reduce((sum, w) => sum + workoutDurationMs(w), 0) / 60000;
    const isToday = date.getTime() === today.getTime();
    if (ws.length) return { label, value: min, display: `${Math.round(min)} min`, emphasize: isToday };
    if (planned.includes(i) && date >= today) return { label, value: 0, display: 'Geplant', variant: 'dashed', emphasize: isToday };
    return { label, value: 0, display: 'Kein Training', variant: 'muted', emphasize: isToday };
  });

  const initials = (settings.name.trim() || 'A').slice(0, 1).toUpperCase();
  const hasNumbers = workouts.length > 0;

  return (
    <Page
      title={settings.name ? `${greeting(now)}, ${settings.name}` : greeting(now)}
      eyebrow={fmtDateLong(now)}
      sample={hasNumbers}
      actions={
        <Link to="/profil" className={s.avatar} aria-label="Profil öffnen">
          {initials}
        </Link>
      }
    >
      <div className="grid">
        {active ? (
          <section className={`card ${s.today}`} aria-labelledby="today-title">
            <span className="label">Workout läuft</span>
            <h2 id="today-title" className="h2">
              {active.name}
            </h2>
            <Link to="/workout" className="btn btnPrimary btnBlock btnLg">
              Workout fortsetzen
            </Link>
          </section>
        ) : plan && day ? (
          <section className={`card ${s.today}`} aria-labelledby="today-title" data-testid="today-card">
            <span className="label">Dein Training heute</span>
            <h2 id="today-title" className="h2">
              {day.name}
            </h2>
            <p className="muted">{dayMuscleGroups(day, byId).join(' · ') || 'Noch keine Übungen'}</p>
            {day.items.length > 0 && (
              <ul className={s.strip} aria-label="Übungen">
                {day.items.map((it, i) => {
                  const ex = byId.get(it.exerciseId);
                  return ex ? (
                    <li key={`${it.exerciseId}-${i}`}>
                      <ExerciseImage exercise={ex} size="md" decorative />
                      <span>{ex.name}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            <div className={s.facts}>
              <span>
                <b className="num">{day.items.length}</b> Übungen
              </span>
              <span>
                <b className="num">{daySetCount(day)}</b> Sätze
              </span>
              <span>
                ca. <b className="num">{estimateMinutes(day, settings.restSeconds)}</b> min
              </span>
            </div>
            <p className="muted small">Plan: {plan.name}</p>
            <button type="button" className="btn btnPrimary btnBlock btnLg" onClick={() => start(plan, day)} disabled={!day.items.length}>
              Workout starten
            </button>
          </section>
        ) : (
          <section className={`card ${s.today}`} data-testid="empty-state">
            <span className="label">Dein Training heute</span>
            <h2 className="h2">Lege deinen ersten Plan an</h2>
            <p className="muted">Mit einem Plan weiß ATHLETIC, was heute dran ist.</p>
            <Link to="/training" className="btn btnPrimary btnBlock btnLg">
              Plan anlegen
            </Link>
          </section>
        )}

        <section className="card" aria-label="Diese Woche">
          <div className={s.stats}>
            <div className={s.stat}>
              <span className={`num ${s.statValue}`}>{fmtNumber(minutes)}</span>
              <span className={s.statLabel}>Minuten diese Woche</span>
            </div>
            <div className={s.stat}>
              <span className={`num ${s.statValue}`}>{streak}</span>
              <span className={s.statLabel}>{streak === 1 ? 'Woche Streak' : 'Wochen Streak'}</span>
            </div>
            <div className={s.stat}>
              <span className={`num ${s.statValue}`}>{fmtVolume(volume)}</span>
              <span className={s.statLabel}>Volumen diese Woche</span>
            </div>
          </div>
          <div className={s.week}>
            <BarChart bars={bars} label="Trainingsminuten je Wochentag" height={110} />
          </div>
          <p className="notice">Gestrichelt: geplanter Trainingstag.</p>
        </section>

        {record ? (
          <Link to="/fortschritt" className={`card ${s.record}`} data-testid="last-record">
            <span className={s.recordIcon}>
              <Icon name="trophy" />
            </span>
            <span className={s.recordText}>
              <span className="label">Letzter Rekord · {fmtDateShort(record.date)}</span>
              <span className={s.recordName}>{byId.get(record.exerciseId)?.name ?? 'Übung'}</span>
              <span className="muted num">
                {RECORD_LABEL[record.type]}: {record.type === 'setVolume' ? fmtVolume(record.value) : `${fmtWeight(Math.round(record.value * 10) / 10)} kg`}
              </span>
            </span>
            <Icon name="chevronRight" className="muted" />
          </Link>
        ) : (
          <div className={`card ${s.record}`}>
            <span className={s.recordIcon}>
              <Icon name="trophy" />
            </span>
            <span className="muted">Noch keine Rekorde. Sie erscheinen hier nach deinem zweiten Training einer Übung.</span>
          </div>
        )}
      </div>
    </Page>
  );
}
