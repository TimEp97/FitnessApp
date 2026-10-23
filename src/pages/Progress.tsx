import { useMemo, useState } from 'react';
import type { Workout } from '../types';
import { Link } from 'react-router-dom';
import { useWorkouts } from '../stores/workouts';
import { useExercises } from '../stores/exercises';
import { useBody } from '../stores/body';
import { useSettings } from '../stores/settings';
import { Page } from '../components/Page';
import { Segmented } from '../components/Segmented';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { Sheet } from '../components/Sheet';
import { DeleteWorkoutSheet } from '../components/DeleteWorkoutSheet';
import { ResetSheet } from '../components/ResetSheet';
import { Stepper } from '../components/Stepper';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { analyzeRecords, best1RM, exerciseHistory, weeklyBuckets, workoutDurationMs, workoutWorkSetCount } from '../logic/metrics';
import { DAY_MS } from '../logic/dates';
import { fmtDateLong, fmtDateShort, fmtMinutes, fmtNumber, fmtVolume, fmtWeight } from '../logic/format';
import s from './Progress.module.css';

const PERIODS = [
  { value: 7, label: '1 W' },
  { value: 30, label: '1 M' },
  { value: 91, label: '3 M' },
  { value: 182, label: '6 M' },
  { value: 365, label: '1 J' },
];

const kg = (v: number) => `${fmtWeight(Math.round(v * 10) / 10)} kg`;

export function Progress() {
  const workouts = useWorkouts((st) => st.workouts);
  const exercises = useExercises((st) => st.exercises);
  const byId = useExercises((st) => st.byId);
  const logs = useBody((st) => st.logs);
  const daysPerWeek = useSettings((st) => st.settings.daysPerWeek);
  const [days, setDays] = useState(91);
  const [weightOpen, setWeightOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Workout | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const now = Date.now();
  const from = now - days * DAY_MS;

  // Übungen mit Historie, die häufigste zuerst
  const trained = useMemo(() => {
    const count = new Map<string, number>();
    for (const w of workouts) for (const e of w.entries) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1);
    return exercises.filter((e) => count.has(e.id)).sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
  }, [workouts, exercises]);
  const [exId, setExId] = useState<string | undefined>(undefined);
  const exerciseId = exId && trained.some((e) => e.id === exId) ? exId : trained[0]?.id;

  const strength = useMemo(() => {
    if (!exerciseId) return [];
    return exerciseHistory(workouts, exerciseId)
      .filter((x) => new Date(x.date).getTime() >= from)
      .map((x) => ({ t: new Date(x.date).getTime(), y: best1RM(x.sets) ?? 0 }))
      .filter((p) => p.y > 0);
  }, [workouts, exerciseId, from]);

  const weeks = Math.max(1, Math.ceil(days / 7));
  const buckets = useMemo(() => weeklyBuckets(workouts, weeks), [workouts, weeks]);
  const doneCount = buckets.reduce((sum, b) => sum + b.workouts.length, 0);
  const plannedCount = weeks * daysPerWeek;
  const bodyPoints = logs.filter((l) => l.weight && new Date(l.date).getTime() >= from).map((l) => ({ t: new Date(l.date).getTime(), y: l.weight! }));
  const lastWeight = logs.filter((l) => l.weight).pop()?.weight;
  const [newWeight, setNewWeight] = useState<number | null>(null);
  const [weightError, setWeightError] = useState<string>();

  const records = useMemo(() => {
    const { records } = analyzeRecords(workouts);
    return [...records.values()].filter((r) => r.e1rm || r.weight).sort((a, b) => (b.e1rm?.date ?? '').localeCompare(a.e1rm?.date ?? ''));
  }, [workouts]);

  if (!workouts.length && !logs.length) {
    return (
      <Page title="Fortschritt">
        <EmptyState icon="chart" title="Noch keine Statistiken" text="Sobald du Workouts protokollierst, siehst du hier deine Entwicklung." action={<Link to="/training" className="btn btnPrimary btnLg">Zum Training</Link>} />
        <BodyWeightButton onClick={() => setWeightOpen(true)} />
        {logs.length > 0 && <ResetButton onClick={() => setResetOpen(true)} />}
        {weightSheet()}
        <ResetSheet open={resetOpen} onClose={() => setResetOpen(false)} />
      </Page>
    );
  }

  function weightSheet() {
    return (
      <Sheet open={weightOpen} onClose={() => setWeightOpen(false)} title="Körpergewicht heute">
        <Stepper label="Körpergewicht" unit="kg" decimal value={newWeight ?? lastWeight ?? 75} onChange={(v) => { setNewWeight(v); setWeightError(undefined); }} step={0.1} min={20} max={400} error={weightError} />
        <button
          type="button"
          className="btn btnPrimary btnBlock btnLg"
          onClick={async () => {
            const v = newWeight ?? lastWeight ?? 75;
            if (v < 20 || v > 400) {
              setWeightError('Bitte ein Gewicht zwischen 20 und 400 kg eingeben.');
              return;
            }
            await useBody.getState().logWeight(v);
            setWeightOpen(false);
            setNewWeight(null);
          }}
        >
          Speichern
        </button>
      </Sheet>
    );
  }

  return (
    <Page title="Fortschritt" sample>
      <Segmented label="Zeitraum" options={PERIODS} value={days} onChange={setDays} />
      <div className="grid">
        <section className="card stack" aria-labelledby="strength-title">
          <h2 id="strength-title" className="h3">
            Kraftentwicklung
          </h2>
          <label className="srOnly" htmlFor="ex-select">
            Übung wählen
          </label>
          <select id="ex-select" className="input" value={exerciseId} onChange={(e) => setExId(e.target.value)}>
            {trained.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          {strength.length ? (
            <>
              <p className="muted small">
                Geschätztes 1RM · aktuell <b className="num">{kg(strength[strength.length - 1].y)}</b>
                {strength.length > 1 && (
                  <>
                    {' '}
                    ({strength[strength.length - 1].y >= strength[0].y ? '+' : '−'}
                    {kg(Math.abs(strength[strength.length - 1].y - strength[0].y))} im Zeitraum)
                  </>
                )}
              </p>
              <LineChart points={strength} formatX={(t) => fmtDateShort(t)} formatY={kg} label={`Geschätztes 1RM ${byId.get(exerciseId!)?.name ?? ''}`} />
            </>
          ) : (
            <p className="muted">Keine Einheiten mit 1 bis 12 Wiederholungen in diesem Zeitraum.</p>
          )}
        </section>

        <section className="card stack" aria-labelledby="volume-title">
          <h2 id="volume-title" className="h3">
            Volumen pro Woche
          </h2>
          <p className="muted small">
            Gesamt im Zeitraum <b className="num">{fmtVolume(buckets.reduce((sum, b) => sum + b.volume, 0))}</b>
          </p>
          <BarChart
            label="Volumen pro Woche"
            bars={buckets.map((b) => ({
              label: `${b.start.getDate()}.${b.start.getMonth() + 1}.`,
              value: b.volume,
              display: fmtVolume(b.volume),
            }))}
          />
        </section>

        <section className="card stack" aria-labelledby="body-title">
          <div className="row">
            <h2 id="body-title" className="h3">
              Körpergewicht
            </h2>
            <span className="spacer" />
            {lastWeight !== undefined && <span className="num muted">{kg(lastWeight)}</span>}
          </div>
          {bodyPoints.length ? <LineChart points={bodyPoints} formatX={(t) => fmtDateShort(t)} formatY={kg} label="Körpergewicht" height={130} /> : <p className="muted">Noch keine Einträge in diesem Zeitraum.</p>}
          <BodyWeightButton onClick={() => setWeightOpen(true)} />
        </section>

        <section className="card stack" aria-labelledby="consistency-title">
          <h2 id="consistency-title" className="h3">
            Konstanz
          </h2>
          <p>
            <b className={`num ${s.big}`}>{doneCount}</b> <span className="muted">von {plannedCount} geplanten Einheiten</span>
            {plannedCount > 0 && <span className="muted num"> · {fmtNumber(Math.min(999, (doneCount / plannedCount) * 100))} %</span>}
          </p>
          <BarChart
            label="Absolvierte Einheiten pro Woche"
            height={100}
            target={daysPerWeek}
            bars={buckets.map((b) => ({
              label: `${b.start.getDate()}.${b.start.getMonth() + 1}.`,
              value: b.workouts.length,
              display: `${b.workouts.length} von ${daysPerWeek}`,
            }))}
          />
          <p className="notice">Gestrichelte Linie: {daysPerWeek} geplante Einheiten pro Woche (im Profil änderbar).</p>
        </section>

        <section className="card stack" aria-labelledby="records-title">
          <h2 id="records-title" className="h3">
            Persönliche Rekorde
          </h2>
          {records.length ? (
            <ul className="list" data-testid="records">
              {records.map((r) => (
                <li key={r.exerciseId}>
                  <Link to={`/uebungen/${r.exerciseId}`} className="listRow">
                    <span className="spacer">
                      <span className={s.recName}>{byId.get(r.exerciseId)?.name ?? 'Übung'}</span>
                      <span className="muted small" style={{ display: 'block' }}>
                        {r.weight ? `Max. ${kg(r.weight.value)} × ${r.weight.reps}` : ''}
                        {r.e1rm ? ` · ${fmtDateShort(r.e1rm.date)}` : ''}
                      </span>
                    </span>
                    {r.e1rm && (
                      <span className={s.recValue}>
                        <b className="num">{kg(r.e1rm.value)}</b>
                        <span className="muted small">1RM geschätzt</span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Noch keine Rekorde.</p>
          )}
        </section>

        <section className="card stack" aria-labelledby="history-title">
          <h2 id="history-title" className="h3">
            Alle Trainings
          </h2>
          {workouts.length ? (
            <ul className="list" data-testid="workout-history">
              {[...workouts].reverse().map((w) => (
                <li key={w.id} className="listRow">
                  <Link to={`/workout/zusammenfassung/${w.id}`} className={`spacer ${s.histLink}`}>
                    <span className={s.recName}>{w.name}</span>
                    <span className="muted small num" style={{ display: 'block' }}>
                      {fmtDateLong(w.startedAt)} · {fmtMinutes(workoutDurationMs(w))} · {workoutWorkSetCount(w)} Sätze
                    </span>
                  </Link>
                  <button type="button" className="iconBtn iconBtnGhost btnDanger" aria-label={`${w.name} vom ${fmtDateLong(w.startedAt)} löschen`} onClick={() => setToDelete(w)}>
                    <Icon name="trash" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Noch keine Trainings.</p>
          )}
        </section>
      </div>
      <p className="notice">
        Volumen und Leistung sind Messwerte aus deinen Protokollen. Das 1RM ist nach Epley geschätzt. Muskelzuwachs lässt sich daraus nicht exakt
        bestimmen.
      </p>
      <ResetButton onClick={() => setResetOpen(true)} />
      {weightSheet()}
      <DeleteWorkoutSheet workout={toDelete} onClose={() => setToDelete(null)} />
      <ResetSheet open={resetOpen} onClose={() => setResetOpen(false)} />
    </Page>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btnBlock btnDanger" onClick={onClick}>
      <Icon name="trash" size={20} /> Alles zurücksetzen
    </button>
  );
}

function BodyWeightButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btnBlock" onClick={onClick}>
      <Icon name="scale" size={20} /> Heute eintragen
    </button>
  );
}
