import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { MuscleId } from '../types';
import { useExercises } from '../stores/exercises';
import { useWorkouts } from '../stores/workouts';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { BodyMap } from '../components/BodyMap';
import { LineChart } from '../components/charts/LineChart';
import { EmptyState } from '../components/EmptyState';
import { ConfirmSheet } from '../components/Sheet';
import { EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL } from '../data/labels';
import { best1RM, exerciseHistory } from '../logic/metrics';
import { fmtDateShort, fmtWeight } from '../logic/format';
import s from './ExerciseDetail.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

export function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ex = useExercises((st) => (id ? st.byId.get(id) : undefined));
  const workouts = useWorkouts((st) => st.workouts);
  const [confirm, setConfirm] = useState(false);

  const back = (
    <button type="button" className="btnLink" onClick={() => navigate(-1)}>
      <Icon name="chevronLeft" size={20} /> Zurück
    </button>
  );

  if (!ex) {
    return (
      <Page title="Übung" back={back}>
        <EmptyState icon="dumbbell" title="Übung nicht gefunden" action={<Link to="/uebungen" className="btn">Zur Bibliothek</Link>} />
      </Page>
    );
  }

  const history = exerciseHistory(workouts, ex.id);
  const points = history.map((h) => ({ t: new Date(h.date).getTime(), y: best1RM(h.sets) ?? 0 })).filter((p) => p.y > 0);
  const colors: Partial<Record<MuscleId, string>> = {};
  for (const m of ex.secondary) colors[m] = 'var(--muscle-secondary)';
  for (const m of ex.primary) colors[m] = 'var(--accent)';

  return (
    <Page title={ex.name} back={back} sample={history.length > 0}>
      <div className="grid">
        <ExerciseImage exercise={ex} size="lg" />

        <section className="card stack" aria-label="Eckdaten">
          <dl className={s.facts}>
            <div>
              <dt>Equipment</dt>
              <dd>{EQUIPMENT_LABEL[ex.equipment]}</dd>
            </div>
            <div>
              <dt>Schwierigkeit</dt>
              <dd>{LEVEL_LABEL[ex.level]}</dd>
            </div>
            <div>
              <dt>Empfohlen</dt>
              <dd className="num">
                {ex.recommended.sets[0]}–{ex.recommended.sets[1]} × {ex.recommended.reps[0]}–{ex.recommended.reps[1]}
              </dd>
            </div>
          </dl>
          <div className={s.muscles}>
            <BodyMap small colors={colors} label={`Primär: ${ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}`} />
            <div className="stack">
              <div>
                <span className="label">Primär</span>
                <p>{ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</p>
              </div>
              {ex.secondary.length > 0 && (
                <div>
                  <span className="label">Sekundär</span>
                  <p className="muted">{ex.secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {ex.steps.length > 0 && (
          <section className="card stack" aria-labelledby="steps-title">
            <h2 id="steps-title" className="h3">
              Ausführung
            </h2>
            <ol className={s.steps}>
              {ex.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
            {ex.breathing && (
              <p>
                <span className="label">Atmung</span>
                <br />
                {ex.breathing}
              </p>
            )}
          </section>
        )}

        {(ex.mistakes.length > 0 || ex.safety) && (
          <section className="card stack" aria-labelledby="mistakes-title">
            {ex.mistakes.length > 0 && (
              <>
                <h2 id="mistakes-title" className="h3">
                  Häufige Fehler
                </h2>
                <ul className={s.mistakes}>
                  {ex.mistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </>
            )}
            {ex.safety && (
              <p className={s.safety}>
                <Icon name="info" size={20} />
                <span>{ex.safety}</span>
              </p>
            )}
          </section>
        )}

        <section className="card stack" aria-labelledby="history-title">
          <h2 id="history-title" className="h3">
            Dein Verlauf
          </h2>
          {history.length ? (
            <>
              {points.length > 1 && <LineChart points={points} formatX={(t) => fmtDateShort(t)} formatY={(v) => `${fmtWeight(Math.round(v * 10) / 10)} kg`} label={`Geschätztes 1RM ${ex.name}`} height={130} />}
              <ul className="list">
                {history
                  .slice(-5)
                  .reverse()
                  .map((h) => (
                    <li key={h.workoutId} className="listRow">
                      <span className="spacer" style={{ whiteSpace: 'nowrap' }}>
                        {fmtDateShort(h.date)}
                      </span>
                      <span className="num muted">{h.sets.map((x) => `${fmtWeight(x.weight)}×${x.reps}`).join('  ')}</span>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="muted">Du hast diese Übung noch nicht protokolliert.</p>
          )}
        </section>
      </div>
      {ex.custom && (
        <>
          <button type="button" className="btn btnDanger" onClick={() => setConfirm(true)}>
            <Icon name="trash" size={20} /> Eigene Übung löschen
          </button>
          <ConfirmSheet
            open={confirm}
            title="Übung löschen?"
            message="Die Übung verschwindet aus der Bibliothek. Protokollierte Sätze bleiben in der Historie."
            confirmLabel="Löschen"
            danger
            onClose={() => setConfirm(false)}
            onConfirm={async () => {
              await useExercises.getState().remove(ex.id);
              navigate('/uebungen', { replace: true });
            }}
          />
        </>
      )}
    </Page>
  );
}
