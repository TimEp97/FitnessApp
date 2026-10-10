import { Link, useParams } from 'react-router-dom';
import type { MuscleId } from '../types';
import { useWorkouts } from '../stores/workouts';
import { useExercises } from '../stores/exercises';
import { Page } from '../components/Page';
import { BodyMap } from '../components/BodyMap';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { MUSCLE_LABEL } from '../data/labels';
import { RECORD_LABEL, recordsInWorkout, sortByStart, workoutDurationMs, workoutVolume, workoutWorkSetCount } from '../logic/metrics';
import { fmtDateLong, fmtMinutes, fmtNumber, fmtVolume, fmtWeight } from '../logic/format';
import s from './Summary.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

function Delta({ value, format }: { value: number; format: (n: number) => string }) {
  if (Math.abs(value) < 1e-9) return <span className="muted">gleich</span>;
  const up = value > 0;
  return (
    <span className={up ? 'accentText' : 'muted'}>
      {up ? '+' : '−'}
      {format(Math.abs(value))}
    </span>
  );
}

export function Summary() {
  const { id } = useParams();
  const workouts = useWorkouts((st) => st.workouts);
  const byId = useExercises((st) => st.byId);
  const w = workouts.find((x) => x.id === id);

  if (!w) {
    return (
      <Page title="Zusammenfassung">
        <EmptyState icon="chart" title="Workout nicht gefunden" action={<Link to="/" className="btn">Zu Home</Link>} />
      </Page>
    );
  }

  const duration = workoutDurationMs(w);
  const volume = workoutVolume(w);
  const sets = workoutWorkSetCount(w);
  const records = recordsInWorkout(workouts, w.id);

  const colors: Partial<Record<MuscleId, string>> = {};
  const trained = new Set<MuscleId>();
  for (const e of w.entries) {
    const ex = byId.get(e.exerciseId);
    if (!ex) continue;
    for (const m of ex.secondary) if (!colors[m]) colors[m] = 'var(--muscle-secondary)';
    for (const m of ex.primary) {
      colors[m] = 'var(--accent)';
      trained.add(m);
    }
  }

  const previous = w.planDayId
    ? sortByStart(workouts.filter((x) => x.planDayId === w.planDayId && x.startedAt < w.startedAt)).pop()
    : undefined;

  return (
    <Page title="Stark gemacht" eyebrow={`${w.name} · ${fmtDateLong(w.startedAt)}`} sample={Boolean(w.sample)}>
      <div className="grid">
        <section className={`card ${s.stats}`} aria-label="Kennzahlen" data-testid="summary-stats">
          <div>
            <span className={`num ${s.value}`}>{fmtMinutes(duration)}</span>
            <span className={s.label}>Dauer</span>
          </div>
          <div>
            <span className={`num ${s.value}`} data-testid="summary-exercises">
              {w.entries.length}
            </span>
            <span className={s.label}>Übungen</span>
          </div>
          <div>
            <span className={`num ${s.value}`} data-testid="summary-sets">
              {sets}
            </span>
            <span className={s.label}>Sätze</span>
          </div>
          <div>
            <span className={`num ${s.value}`} data-testid="summary-volume">
              {fmtVolume(volume)}
            </span>
            <span className={s.label}>Volumen</span>
          </div>
        </section>

        <section className="card stack" aria-labelledby="done-title">
          <h2 id="done-title" className="h3">
            Absolvierte Übungen
          </h2>
          <ul className="list">
            {w.entries.map((e, i) => {
              const ex = byId.get(e.exerciseId);
              const work = e.sets.filter((x) => x.kind === 'work');
              return (
                <li key={`${e.exerciseId}-${i}`} className="listRow">
                  {ex && <ExerciseImage exercise={ex} size="thumb" decorative />}
                  <span className="spacer">
                    <span className={s.recName}>{ex?.name ?? 'Übung'}</span>
                    <span className="muted small num" style={{ display: 'block' }}>
                      {work.map((x) => `${fmtWeight(x.weight)}×${x.reps}`).join('  ')}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card stack" aria-labelledby="muscles-title">
          <h2 id="muscles-title" className="h3">
            Trainierte Muskelgruppen
          </h2>
          <BodyMap small colors={colors} label={`Trainiert: ${[...trained].map((m) => MUSCLE_LABEL[m]).join(', ')}`} />
          <p className="muted small">{[...trained].map((m) => MUSCLE_LABEL[m]).join(', ')}</p>
        </section>

        <section className="card stack" aria-labelledby="records-title">
          <h2 id="records-title" className="h3">
            Neue Rekorde
          </h2>
          {records.length ? (
            <ul className="list">
              {records.map((r, i) => (
                <li key={i} className="listRow">
                  <span className={s.trophy}>
                    <Icon name="trophy" size={20} />
                  </span>
                  <span className="spacer">
                    <span className={s.recName}>{byId.get(r.exerciseId)?.name}</span>
                    <span className="muted small" style={{ display: 'block' }}>
                      {RECORD_LABEL[r.type]}
                    </span>
                  </span>
                  <span className="num">{r.type === 'setVolume' ? fmtVolume(r.value) : `${fmtWeight(Math.round(r.value * 10) / 10)} kg`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Diesmal kein neuer Rekord. Konstanz zahlt sich aus.</p>
          )}
        </section>

        <section className="card stack" aria-labelledby="compare-title">
          <h2 id="compare-title" className="h3">
            Vergleich zum letzten {w.name}
          </h2>
          {previous ? (
            <ul className="list">
              <li className="listRow">
                <span className="spacer">Volumen</span>
                <Delta value={volume - workoutVolume(previous)} format={fmtVolume} />
              </li>
              <li className="listRow">
                <span className="spacer">Sätze</span>
                <Delta value={sets - workoutWorkSetCount(previous)} format={(n) => fmtNumber(n)} />
              </li>
              <li className="listRow">
                <span className="spacer">Dauer</span>
                <Delta value={duration - workoutDurationMs(previous)} format={fmtMinutes} />
              </li>
            </ul>
          ) : (
            <p className="muted">Noch kein früheres Workout dieses Plantags.</p>
          )}
        </section>
      </div>
      <Link to="/" className="btn btnPrimary btnBlock btnLg">
        Fertig
      </Link>
    </Page>
  );
}
