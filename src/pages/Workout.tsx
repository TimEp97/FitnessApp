import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SetLog } from '../types';
import { useWorkouts } from '../stores/workouts';
import { useExercises } from '../stores/exercises';
import { useSettings } from '../stores/settings';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { SortableList } from '../components/SortableList';
import { ExercisePicker } from '../components/ExercisePicker';
import { EmptyState } from '../components/EmptyState';
import { useNow } from '../hooks/useNow';
import { exerciseHistory, workoutDurationMs, workoutSetCount } from '../logic/metrics';
import { suggestWeight } from '../logic/suggestions';
import { fmtDuration, fmtWeight } from '../logic/format';
import s from './Workout.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

export const WEIGHT_MAX = 500;
export const REPS_MAX = 100;

export function validateWeight(v: number | null): string | undefined {
  if (v === null) return 'Bitte ein Gewicht angeben (0 bei Körpergewicht).';
  if (v < 0 || v > WEIGHT_MAX) return `Gewicht muss zwischen 0 und ${WEIGHT_MAX} kg liegen.`;
  return undefined;
}

export function validateReps(v: number | null): string | undefined {
  if (v === null) return 'Bitte die Wiederholungen angeben.';
  if (!Number.isInteger(v) || v < 1 || v > REPS_MAX) return `Wiederholungen müssen zwischen 1 und ${REPS_MAX} liegen.`;
  return undefined;
}

function setsSummary(sets: SetLog[]): string {
  if (!sets.length) return '';
  const weights = new Set(sets.map((x) => x.weight));
  if (weights.size === 1) return `${fmtWeight(sets[0].weight)} kg × ${sets.map((x) => x.reps).join(', ')}`;
  return sets.map((x) => `${fmtWeight(x.weight)}×${x.reps}`).join(', ');
}

export function WorkoutPage() {
  const navigate = useNavigate();
  const active = useWorkouts((st) => st.active);
  const workouts = useWorkouts((st) => st.workouts);
  const byId = useExercises((st) => st.byId);
  const restSeconds = useSettings((st) => st.settings.restSeconds);
  const paused = Boolean(active?.cursor?.pausedAt);
  const now = useNow(active && !paused ? 1000 : null);

  const index = active ? Math.min(active.cursor?.index ?? 0, Math.max(0, active.entries.length - 1)) : 0;
  const entry = active?.entries[index];
  const exercise = entry ? byId.get(entry.exerciseId) : undefined;
  const history = useMemo(() => (entry ? exerciseHistory(workouts, entry.exerciseId) : []), [workouts, entry?.exerciseId]);
  const lastSession = history[history.length - 1];
  const target = entry?.target ?? (exercise ? { sets: exercise.recommended.sets[0], reps: exercise.recommended.reps } : undefined);

  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ weight?: string; reps?: string }>({});
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [editSet, setEditSet] = useState<SetLog | null>(null);
  const [noteText, setNoteText] = useState('');

  // Vorbelegung: letzter Satz dieser Übung im laufenden Workout, sonst letztes Training, sonst leer.
  const setCount = entry?.sets.length ?? 0;
  useEffect(() => {
    if (!entry) return;
    const lastHere = entry.sets[entry.sets.length - 1];
    const fromHistory = lastSession?.sets[Math.min(entry.sets.length, (lastSession?.sets.length ?? 1) - 1)];
    const src = lastHere ?? fromHistory;
    setWeight(src ? src.weight : null);
    setReps(src ? src.reps : null);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, index, entry?.exerciseId, setCount]);

  useEffect(() => setShowSuggestion(false), [index, entry?.exerciseId]);

  const touch = useRef<{ x: number; y: number } | null>(null);

  if (!active) {
    return (
      <Page title="Workout">
        <EmptyState
          icon="dumbbell"
          title="Kein Workout aktiv"
          text="Starte ein Workout über den Tab Training."
          action={
            <Link to="/training" className="btn btnPrimary btnLg">
              Zum Training
            </Link>
          }
        />
      </Page>
    );
  }

  const ws = useWorkouts.getState();
  const elapsed = workoutDurationMs(active, now);
  const next = active.entries[index + 1];
  const nextEx = next ? byId.get(next.exerciseId) : undefined;

  const complete = async () => {
    const e = { weight: validateWeight(weight), reps: validateReps(reps) };
    setErrors(e);
    if (e.weight || e.reps || weight === null || reps === null) return;
    navigator.vibrate?.(30);
    await ws.completeSet(index, weight, reps, restSeconds);
  };

  const suggestion = exercise && target ? suggestWeight(history, target.reps, exercise.weightStep) : null;

  const header = (
    <>
      <button
        type="button"
        className={`btn ${s.clock}`}
        onClick={() => ws.togglePause()}
        aria-label={paused ? `Pausiert bei ${fmtDuration(elapsed)}. Fortsetzen` : `Laufzeit ${fmtDuration(elapsed)}. Pausieren`}
        data-testid="workout-clock"
      >
        <Icon name={paused ? 'play' : 'pause'} size={18} />
        <span className="num">{fmtDuration(elapsed)}</span>
      </button>
      <button type="button" className="btn" onClick={() => setFinishOpen(true)}>
        Beenden
      </button>
    </>
  );

  return (
    <Page title={active.name} toolbar={header}>
      {paused && (
        <p className={s.pausedNote} role="status">
          Workout pausiert. Tippe auf die Zeit, um fortzusetzen.
        </p>
      )}

      {!entry || !exercise ? (
        <EmptyState
          icon="plus"
          title="Noch keine Übung"
          text="Füge die erste Übung hinzu."
          action={
            <button type="button" className="btn btnPrimary btnLg" onClick={() => setPickerOpen(true)}>
              Übung hinzufügen
            </button>
          }
        />
      ) : (
        <div className="grid">
          <section
            className={`card ${s.exercise}`}
            aria-labelledby="ex-name"
            onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
            onPointerUp={(e) => {
              const t = touch.current;
              touch.current = null;
              if (!t || (e.target as HTMLElement).closest('input')) return;
              const dx = e.clientX - t.x;
              const dy = e.clientY - t.y;
              if (Math.abs(dx) > 70 && Math.abs(dy) < 40) ws.goTo(dx < 0 ? index + 1 : index - 1);
            }}
          >
            <div className={s.exHead}>
              <Link to={`/uebungen/${exercise.id}`} aria-label={`Anleitung ${exercise.name}`} className={s.exImage}>
                <ExerciseImage exercise={exercise} size="md" decorative />
              </Link>
              <div className="spacer">
                <span className="muted small num">
                  Übung {index + 1} von {active.entries.length}
                </span>
              </div>
              <button
                type="button"
                className={`iconBtn ${entry.note ? s.hasNote : ''}`}
                aria-label={entry.note ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
                onClick={() => {
                  setNoteText(entry.note ?? '');
                  setNoteOpen(true);
                }}
              >
                <Icon name="note" size={20} />
              </button>
            </div>
            <h2 id="ex-name" className={s.exName} data-testid="exercise-name">
              {exercise.name}
            </h2>

            <div className={s.meta}>
              <span className={s.setNo} data-testid="set-number">
                Satz {entry.sets.length + 1}
                {target ? <span className="muted"> von {target.sets}</span> : null}
              </span>
              <span className="muted small">
                {target ? `Ziel ${target.reps[0]}–${target.reps[1]} Wdh.` : ''}
              </span>
              <span className="spacer" />
              <Link to={`/uebungen/${exercise.id}`} className="btnLink">
                Anleitung
              </Link>
            </div>
            <p className="muted small" data-testid="last-performance">
              {lastSession ? `Zuletzt: ${setsSummary(lastSession.sets)}` : 'Noch keine frühere Leistung'}
            </p>
            {entry.note && <p className={s.note}>{entry.note}</p>}

            <div className={s.inputs}>
              <Stepper
                label={exercise.equipment === 'bodyweight' ? 'Zusatzgewicht' : 'Gewicht'}
                unit="kg"
                decimal
                value={weight}
                onChange={(v) => {
                  setWeight(v);
                  setErrors((x) => ({ ...x, weight: undefined }));
                }}
                step={exercise.weightStep}
                min={0}
                max={WEIGHT_MAX}
                emptyStart={exercise.equipment === 'bodyweight' ? exercise.weightStep : exercise.equipment === 'barbell' ? 20 : exercise.weightStep * 4}
                error={errors.weight}
              />
              <Stepper
                label="Wiederholungen"
                value={reps}
                onChange={(v) => {
                  setReps(v);
                  setErrors((x) => ({ ...x, reps: undefined }));
                }}
                step={1}
                min={1}
                max={REPS_MAX}
                emptyStart={target?.reps[0] ?? 8}
                error={errors.reps}
              />
            </div>

            <button type="button" className={`btn btnPrimary btnBlock ${s.complete}`} onClick={complete}>
              <Icon name="check" /> Satz abschließen
            </button>

            {showSuggestion && suggestion ? (
              <div className={s.suggestion} data-testid="weight-suggestion" role="status">
                <p>{suggestion.text}</p>
                <div className="row">
                  {suggestion.kind !== 'none' && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setWeight(suggestion.weight);
                        setReps(suggestion.reps);
                        setErrors({});
                        setShowSuggestion(false);
                      }}
                    >
                      Übernehmen
                    </button>
                  )}
                  <button type="button" className="btn btnGhost" onClick={() => setShowSuggestion(false)}>
                    Schließen
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btnGhost btnBlock" onClick={() => setShowSuggestion(true)}>
                <Icon name="sparkle" size={20} /> Gewichtsvorschlag anzeigen
              </button>
            )}

            {entry.sets.length > 0 && (
              <div className="stack">
                <span className="label">Erledigt</span>
                <ul className={s.done} aria-label="Erledigte Sätze">
                  {entry.sets.map((st, i) => (
                    <li key={st.id}>
                      <button type="button" className={`${s.mark} ${st.kind === 'warmup' ? s.warmup : ''}`} onClick={() => setEditSet(st)} data-testid="done-set">
                        <span className={s.markNo}>{st.kind === 'warmup' ? 'A' : i + 1 - entry.sets.slice(0, i).filter((x) => x.kind === 'warmup').length}</span>
                        <span className="num">
                          {fmtWeight(st.weight)} × {st.reps}
                        </span>
                        <span className="srOnly">{st.kind === 'warmup' ? 'Aufwärmsatz' : 'Arbeitssatz'}, bearbeiten</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card stack" aria-label="Als Nächstes">
            <button type="button" className={s.nextBtn} onClick={() => setListOpen(true)}>
              <span className="spacer">
                <span className="label">Als Nächstes</span>
                <span className={s.nextName}>{nextEx ? nextEx.name : 'Letzte Übung'}</span>
              </span>
              <Icon name="list" />
              <span className="srOnly">Übungsliste öffnen</span>
            </button>
            <div className="row">
              <button type="button" className="btn" onClick={() => ws.goTo(index - 1)} disabled={index === 0} aria-label="Vorherige Übung">
                <Icon name="chevronLeft" />
              </button>
              <button type="button" className="btn spacer" onClick={() => (next ? ws.goTo(index + 1) : setPickerOpen(true))}>
                {next ? (
                  <>
                    Nächste Übung <Icon name="chevronRight" size={20} />
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={20} /> Übung hinzufügen
                  </>
                )}
              </button>
            </div>
            <p className="notice">Tipp: Nach links wischen wechselt zur nächsten Übung.</p>
          </section>
        </div>
      )}

      {/* Übungsliste des Workouts */}
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Übungen im Workout">
        <SortableList
          items={active.entries}
          getKey={(e, i) => `${e.exerciseId}-${i}`}
          getLabel={(e) => byId.get(e.exerciseId)?.name ?? 'Übung'}
          onMove={(from, to) => ws.moveEntry(from, to)}
          render={(e, i) => (
            <>
              <button
                type="button"
                className={`${s.jump} ${i === index ? s.jumpCurrent : ''}`}
                onClick={() => {
                  ws.goTo(i);
                  setListOpen(false);
                }}
                aria-current={i === index ? 'step' : undefined}
              >
                <span className={s.jumpName}>{byId.get(e.exerciseId)?.name ?? 'Übung'}</span>
                <span className="muted small num">
                  {e.sets.length}
                  {e.target ? ` / ${e.target.sets}` : ''} Sätze
                </span>
              </button>
              <button type="button" className="iconBtn iconBtnGhost" aria-label={`${byId.get(e.exerciseId)?.name ?? 'Übung'} entfernen`} onClick={() => ws.removeEntry(i)}>
                <Icon name="close" size={18} />
              </button>
            </>
          )}
        />
        <button
          type="button"
          className="btn btnBlock"
          onClick={() => {
            setListOpen(false);
            setPickerOpen(true);
          }}
        >
          <Icon name="plus" size={20} /> Übung hinzufügen
        </button>
      </Sheet>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existing={new Set(active.entries.map((e) => e.exerciseId))}
        onPick={async (id) => {
          await ws.addExercise(id);
          setPickerOpen(false);
          await ws.goTo(useWorkouts.getState().active!.entries.length - 1);
        }}
      />

      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Notiz zur Übung">
        <label className="srOnly" htmlFor="note">
          Notiz
        </label>
        <textarea id="note" className="input" value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={500} placeholder="z. B. Sitzhöhe 4, Griff eng" />
        <button
          type="button"
          className="btn btnBlock"
          onClick={async () => {
            await ws.setEntryNote(index, noteText);
            setNoteOpen(false);
          }}
        >
          Notiz speichern
        </button>
      </Sheet>

      <SetEditSheet set={editSet} step={exercise?.weightStep ?? 2.5} onClose={() => setEditSet(null)} entryIndex={index} />

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Workout beenden?">
        <p className="muted">
          {workoutSetCount(active) > 0
            ? `${workoutSetCount(active)} Sätze in ${fmtDuration(elapsed)}. Übungen ohne Satz werden nicht gespeichert.`
            : 'Noch kein Satz protokolliert. Das Workout wird ohne Speichern beendet.'}
        </p>
        <button
          type="button"
          className="btn btnPrimary btnBlock btnLg"
          onClick={async () => {
            const id = await ws.finish();
            setFinishOpen(false);
            navigate(id ? `/workout/zusammenfassung/${id}` : '/', { replace: true });
          }}
        >
          {workoutSetCount(active) > 0 ? 'Beenden und speichern' : 'Beenden'}
        </button>
        {workoutSetCount(active) > 0 && (
          <button
            type="button"
            className="btn btnBlock btnDanger"
            onClick={async () => {
              await ws.discard();
              setFinishOpen(false);
              navigate('/', { replace: true });
            }}
          >
            Workout verwerfen
          </button>
        )}
        <button type="button" className="btn btnGhost btnBlock" onClick={() => setFinishOpen(false)}>
          Weiter trainieren
        </button>
      </Sheet>
    </Page>
  );
}

function SetEditSheet({ set, step, onClose, entryIndex }: { set: SetLog | null; step: number; onClose: () => void; entryIndex: number }) {
  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ weight?: string; reps?: string }>({});
  useEffect(() => {
    setWeight(set?.weight ?? null);
    setReps(set?.reps ?? null);
    setErrors({});
  }, [set]);
  const ws = useWorkouts.getState();
  if (!set) return null;
  return (
    <Sheet open onClose={onClose} title="Satz bearbeiten">
      <Stepper size="sm" label="Gewicht" unit="kg" decimal value={weight} onChange={setWeight} step={step} min={0} max={WEIGHT_MAX} error={errors.weight} />
      <Stepper size="sm" label="Wiederholungen" value={reps} onChange={setReps} step={1} min={1} max={REPS_MAX} error={errors.reps} />
      <button
        type="button"
        className="btn btnBlock"
        onClick={async () => {
          const e = { weight: validateWeight(weight), reps: validateReps(reps) };
          setErrors(e);
          if (e.weight || e.reps || weight === null || reps === null) return;
          await ws.updateSet(entryIndex, set.id, { weight, reps });
          onClose();
        }}
      >
        Speichern
      </button>
      <button
        type="button"
        className="btn btnBlock"
        onClick={async () => {
          await ws.updateSet(entryIndex, set.id, { kind: set.kind === 'warmup' ? 'work' : 'warmup' });
          onClose();
        }}
      >
        {set.kind === 'warmup' ? 'Als Arbeitssatz markieren' : 'Als Aufwärmsatz markieren'}
      </button>
      <button
        type="button"
        className="btn btnBlock btnDanger"
        onClick={async () => {
          await ws.deleteSet(entryIndex, set.id);
          onClose();
        }}
      >
        <Icon name="trash" size={20} /> Satz löschen
      </button>
    </Sheet>
  );
}
