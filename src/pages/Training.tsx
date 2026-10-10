import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Plan } from '../types';
import { useSettings } from '../stores/settings';
import { useWorkouts } from '../stores/workouts';
import { useExercises } from '../stores/exercises';
import { useActivePlan, usePlans } from '../stores/plans';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { EmptyState } from '../components/EmptyState';
import { useStartWorkout } from '../hooks/useStartWorkout';
import { useLongPress } from '../hooks/useLongPress';
import { PLAN_TEMPLATES } from '../data/templates';
import { daySetCount, emptyPlan, estimateMinutes, nextPlanDay, planFromTemplate } from '../logic/planning';
import { suggestExercises, type ExerciseSuggestion } from '../logic/suggestions';
import s from './Training.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

function PlanCard({ plan, active, onActivate }: { plan: Plan; active: boolean; onActivate: () => void }) {
  const navigate = useNavigate();
  const lp = useLongPress(() => navigate(`/training/plan/${plan.id}`));
  const sets = plan.days.reduce((sum, d) => sum + daySetCount(d), 0);
  return (
    <li className={`${s.planCard} ${active ? s.planActive : ''}`} data-testid="plan-card">
      <button
        type="button"
        className={s.planMain}
        aria-pressed={active}
        onClick={() => {
          if (!lp.consumeClick()) onActivate();
        }}
        {...lp}
      >
        <span className={s.planName}>{plan.name}</span>
        <span className="muted small">
          {plan.days.length} {plan.days.length === 1 ? 'Tag' : 'Tage'} · {sets} Sätze
        </span>
        {active && <span className={s.activeTag}>Aktiv</span>}
      </button>
      <Link to={`/training/plan/${plan.id}`} className="iconBtn iconBtnGhost" aria-label={`${plan.name} bearbeiten`}>
        <Icon name="chevronRight" />
      </Link>
    </li>
  );
}

export function Training() {
  const settings = useSettings((st) => st.settings);
  const workouts = useWorkouts((st) => st.workouts);
  const exercises = useExercises((st) => st.exercises);
  const byId = useExercises((st) => st.byId);
  const plans = usePlans((st) => st.plans);
  const plan = useActivePlan();
  const start = useStartWorkout();
  const navigate = useNavigate();

  const next = nextPlanDay(plan, workouts);
  const [dayId, setDayId] = useState<string | undefined>(next?.id);
  useEffect(() => setDayId(next?.id), [plan?.id, next?.id]);
  const day = plan?.days.find((d) => d.id === dayId) ?? next;

  const [newOpen, setNewOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[] | null>(null);

  const dayIds = useMemo(() => new Set(day?.items.map((i) => i.exerciseId)), [day]);

  const showSuggestions = () => {
    setSuggestions(
      suggestExercises({ workouts, exercises, plan, equipment: settings.equipment, experience: settings.experience }),
    );
  };

  const toggleSuggestion = async (sg: ExerciseSuggestion) => {
    if (!plan || !day) return;
    const has = dayIds.has(sg.exercise.id);
    const items = has
      ? day.items.filter((i) => i.exerciseId !== sg.exercise.id)
      : [...day.items, { exerciseId: sg.exercise.id, sets: sg.exercise.recommended.sets[0], reps: [...sg.exercise.recommended.reps] as [number, number] }];
    await usePlans.getState().save({ ...plan, days: plan.days.map((d) => (d.id === day.id ? { ...d, items } : d)) });
  };

  const createPlan = async (p: Plan) => {
    await usePlans.getState().save(p);
    setNewOpen(false);
    navigate(`/training/plan/${p.id}`);
  };

  return (
    <Page
      title="Training"
      actions={
        <Link to="/uebungen" className="btn" aria-label="Übungsbibliothek">
          <Icon name="list" size={20} /> Übungen
        </Link>
      }
    >
      <div className="grid">
        {plan && day ? (
          <section className="card stack" aria-labelledby="heute">
            <div className="row">
              <span id="heute" className="label">
                Heute
              </span>
              <span className="spacer" />
              <span className="muted small">{plan.name}</span>
            </div>
            <label className="srOnly" htmlFor="day-select">
              Trainingstag wählen
            </label>
            <select id="day-select" className="input" value={day.id} onChange={(e) => setDayId(e.target.value)}>
              {plan.days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.id === next?.id ? ' (als Nächstes)' : ''}
                </option>
              ))}
            </select>
            {day.items.length ? (
              <ol className={`list ${s.dayList}`}>
                {day.items.map((it, i) => {
                  const ex = byId.get(it.exerciseId);
                  return (
                  <li key={`${it.exerciseId}-${i}`} className={s.dayItem}>
                    {ex && <ExerciseImage exercise={ex} size="thumb" decorative />}
                    <span className={s.dayName}>{ex?.name ?? 'Unbekannte Übung'}</span>
                    <span className="muted num">
                      {it.sets} × {it.reps[0]}–{it.reps[1]}
                    </span>
                  </li>
                  );
                })}
              </ol>
            ) : (
              <p className="muted">Dieser Tag hat noch keine Übungen.</p>
            )}
            <p className="muted small">
              {daySetCount(day)} Sätze · ca. {estimateMinutes(day, settings.restSeconds)} min
            </p>
            <button type="button" className="btn btnPrimary btnBlock btnLg" onClick={() => start(plan, day)} disabled={!day.items.length}>
              Workout starten
            </button>
            <button type="button" className="btn btnGhost btnBlock" onClick={() => start()}>
              Freies Training ohne Plan
            </button>
          </section>
        ) : (
          <EmptyState
            icon="dumbbell"
            title="Lege deinen ersten Plan an"
            text="Wähle eine Vorlage oder starte mit einem leeren Plan."
            action={
              <button type="button" className="btn btnPrimary btnLg" onClick={() => setNewOpen(true)}>
                <Icon name="plus" size={20} /> Neuer Plan
              </button>
            }
          />
        )}

        {plan && day && (
          <section className="card stack" aria-label="Übungsvorschläge">
            {suggestions === null ? (
              <>
                <p className="muted">Fehlt etwas? ATHLETIC sucht Muskeln, die in den letzten 30 Tagen kaum trainiert wurden.</p>
                <button type="button" className="btn btnBlock" onClick={showSuggestions}>
                  <Icon name="sparkle" size={20} /> Übungen vorschlagen
                </button>
              </>
            ) : (
              <div className="stack" data-testid="suggestions">
                <div className="row">
                  <h2 className="h3">Vorschläge für {day.name}</h2>
                  <span className="spacer" />
                  <button type="button" className="btnLink" onClick={() => setSuggestions(null)}>
                    Ausblenden
                  </button>
                </div>
                {suggestions.length ? (
                  <ul className="list">
                    {suggestions.map((sg) => {
                      const added = dayIds.has(sg.exercise.id);
                      return (
                        <li key={sg.exercise.id} className="listRow" data-testid="suggestion">
                          <ExerciseImage exercise={sg.exercise} size="thumb" decorative />
                          <div className="spacer">
                            <Link to={`/uebungen/${sg.exercise.id}`} className={s.sgName}>
                              {sg.exercise.name}
                            </Link>
                            <div className="muted small">{sg.reason}</div>
                          </div>
                          <button
                            type="button"
                            className={`iconBtn ${added ? s.added : ''}`}
                            aria-pressed={added}
                            aria-label={added ? `${sg.exercise.name} wieder entfernen` : `${sg.exercise.name} zu ${day.name} hinzufügen`}
                            onClick={() => toggleSuggestion(sg)}
                          >
                            <Icon name={added ? 'check' : 'plus'} size={20} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted">Alle Muskelgruppen wurden in den letzten 30 Tagen ausreichend trainiert, oder es fehlt passendes Equipment.</p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="stack" aria-labelledby="plans-title">
          <div className="row">
            <h2 id="plans-title" className="h2">
              Deine Pläne
            </h2>
            <span className="spacer" />
            <button type="button" className="btn" onClick={() => setNewOpen(true)}>
              <Icon name="plus" size={20} /> Neuer Plan
            </button>
          </div>
          {plans.length ? (
            <>
              <ul className={`list ${s.plans}`}>
                {plans.map((p) => (
                  <PlanCard key={p.id} plan={p} active={p.id === plan?.id} onActivate={() => usePlans.getState().activate(p.id)} />
                ))}
              </ul>
              <p className="notice">Tippen macht einen Plan aktiv. Langes Drücken oder der Pfeil öffnet ihn zum Bearbeiten.</p>
            </>
          ) : (
            <p className="muted">Noch keine Pläne.</p>
          )}
        </section>
      </div>

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="Neuer Plan">
        <ul className="list">
          {PLAN_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`listRow ${s.tplBtn}`}
                onClick={() => createPlan(planFromTemplate(t, exercises, { equipment: settings.equipment, goal: settings.goal }))}
              >
                <span className="spacer">
                  <span className={s.planName}>{t.name}</span>
                  <span className="muted small" style={{ display: 'block' }}>
                    {t.description}
                  </span>
                </span>
                <Icon name="plus" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={`listRow ${s.tplBtn}`} onClick={() => createPlan(emptyPlan())}>
              <span className="spacer">
                <span className={s.planName}>Leerer Plan</span>
                <span className="muted small" style={{ display: 'block' }}>
                  Tage und Übungen selbst festlegen
                </span>
              </span>
              <Icon name="plus" />
            </button>
          </li>
        </ul>
      </Sheet>
    </Page>
  );
}
