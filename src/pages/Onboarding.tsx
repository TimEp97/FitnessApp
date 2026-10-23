import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Equipment, Goal, Level } from '../types';
import { useSettings } from '../stores/settings';
import { useAuth } from '../auth/auth';
import { useExercises } from '../stores/exercises';
import { usePlans } from '../stores/plans';
import { Icon } from '../components/Icon';
import { EQUIPMENT, EQUIPMENT_LABEL, GOAL_HINT, GOAL_LABEL, LEVEL_LABEL } from '../data/labels';
import { daySetCount, planFromTemplate, recommendTemplate } from '../logic/planning';
import { SESSION_OPTIONS } from './Profile';
import s from './Onboarding.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

const LEVEL_HINT: Record<Level, string> = {
  beginner: 'Weniger als 1 Jahr Krafttraining',
  intermediate: '1 bis 3 Jahre regelmäßig',
  advanced: 'Mehr als 3 Jahre',
};

export function Onboarding() {
  const settings = useSettings((st) => st.settings);
  const exercises = useExercises((st) => st.exercises);
  const byId = useExercises((st) => st.byId);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const username = useAuth((st) => st.user?.username ?? '');
  const [name, setName] = useState(settings.name || username);
  const [goal, setGoal] = useState<Goal>(settings.goal);
  const [experience, setExperience] = useState<Level>(settings.experience);
  const [days, setDays] = useState(settings.daysPerWeek);
  const [minutes, setMinutes] = useState(settings.sessionMinutes);
  const [equipment, setEquipment] = useState<Equipment[]>(settings.equipment);

  const template = recommendTemplate({ daysPerWeek: days, experience });
  const plan = useMemo(
    () => (step === 3 ? planFromTemplate(template, exercises, { equipment, goal }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, template.id, equipment, goal, exercises],
  );

  const finish = async (accept: boolean) => {
    const update = useSettings.getState().update;
    if (accept && plan) {
      await usePlans.getState().save(plan);
      await update({ name: name.trim(), goal, experience, daysPerWeek: days, sessionMinutes: minutes, equipment, onboardingDone: true, activePlanId: plan.id });
    } else {
      await update({ name: name.trim(), goal, experience, daysPerWeek: days, sessionMinutes: minutes, equipment, onboardingDone: true });
    }
    navigate('/', { replace: true });
  };

  const skip = async () => {
    await useSettings.getState().update({ onboardingDone: true, name: name.trim() || settings.name });
    navigate('/', { replace: true });
  };

  const heroExercises = ['squat', 'bench-press', 'deadlift'].map((id) => byId.get(id)).filter((e) => e !== undefined);

  const toggleEq = (e: Equipment) => setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]));

  return (
    <div className={s.wrap}>
      <header className={s.top}>
        {step > 0 ? (
          <button type="button" className="iconBtn iconBtnGhost" onClick={() => setStep(step - 1)} aria-label="Zurück">
            <Icon name="chevronLeft" />
          </button>
        ) : (
          <span className={s.brand}>ATHLETIC</span>
        )}
        <div className={s.dots} aria-label={`Schritt ${step + 1} von 4`} role="img">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`${s.dot} ${i <= step ? s.dotOn : ''}`} />
          ))}
        </div>
        <button type="button" className="btnLink" onClick={skip}>
          Überspringen
        </button>
      </header>

      <main className={s.main}>
        {step === 0 && (
          <section className="stackLg" aria-labelledby="ob-title">
            <div className={s.hero} aria-hidden="true">
              {heroExercises.map((ex) => (
                <ExerciseImage key={ex.id} exercise={ex} size="lg" decorative />
              ))}
            </div>
            <h1 id="ob-title" className="h1">
              Willkommen bei ATHLETIC
            </h1>
            <p className="muted">Protokolliere dein Krafttraining in Sekunden. Deine Daten bleiben bei dir: im Browser und auf Wunsch auf deinem eigenen Server.</p>
            <div>
              <label className="fieldLabel" htmlFor="ob-name">
                Wie heißt du?
              </label>
              <input id="ob-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname" maxLength={40} autoComplete="given-name" />
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="stackLg" aria-labelledby="ob-title">
            <h1 id="ob-title" className="h1">
              Ziel und Erfahrung
            </h1>
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>Was ist dein Ziel?</legend>
              <div className={s.tiles}>
                {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
                  <button key={g} type="button" className={s.tile} aria-pressed={goal === g} onClick={() => setGoal(g)}>
                    <span className={s.tileTitle}>{GOAL_LABEL[g]}</span>
                    <span className={s.tileHint}>{GOAL_HINT[g]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>Wie viel Erfahrung hast du?</legend>
              <div className={s.tiles}>
                {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                  <button key={l} type="button" className={s.tile} aria-pressed={experience === l} onClick={() => setExperience(l)}>
                    <span className={s.tileTitle}>{LEVEL_LABEL[l]}</span>
                    <span className={s.tileHint}>{LEVEL_HINT[l]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>
        )}

        {step === 2 && (
          <section className="stackLg" aria-labelledby="ob-title">
            <h1 id="ob-title" className="h1">
              Dein Rahmen
            </h1>
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>Trainingstage pro Woche</legend>
              <div className={s.tilesRow}>
                {[2, 3, 4, 5, 6].map((d) => (
                  <button key={d} type="button" className={`${s.tile} ${s.tileSmall}`} aria-pressed={days === d} onClick={() => setDays(d)}>
                    <span className={`num ${s.tileTitle}`}>{d}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>Dauer pro Einheit</legend>
              <div className={s.tilesRow}>
                {SESSION_OPTIONS.map((m) => (
                  <button key={m} type="button" className={`${s.tile} ${s.tileSmall}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                    <span className={`num ${s.tileTitle}`}>{m}</span>
                    <span className={s.tileHint}>min</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>Welches Equipment hast du?</legend>
              <div className={s.tiles}>
                {EQUIPMENT.map((e) => (
                  <button key={e} type="button" className={s.tile} aria-pressed={equipment.includes(e)} onClick={() => toggleEq(e)}>
                    <span className={s.tileTitle}>{EQUIPMENT_LABEL[e]}</span>
                  </button>
                ))}
              </div>
              {!equipment.length && <p className="fieldError">Ohne Auswahl werden alle Übungen berücksichtigt.</p>}
            </fieldset>
          </section>
        )}

        {step === 3 && plan && (
          <section className="stackLg" aria-labelledby="ob-title">
            <h1 id="ob-title" className="h1">
              Dein Planvorschlag
            </h1>
            <p className="muted">
              Aus deinen Antworten: <b>{template.name}</b> für {GOAL_LABEL[goal]}. Du kannst ihn jederzeit ändern oder weitere Pläne anlegen.
            </p>
            <div className="stack" data-testid="plan-proposal">
              {plan.days.map((d) => (
                <div key={d.id} className="card stack">
                  <div className="row">
                    <h2 className="h3">{d.name}</h2>
                    <span className="spacer" />
                    <span className="muted small">{daySetCount(d)} Sätze</span>
                  </div>
                  <ul className={s.items}>
                    {d.items.map((it) => (
                      <li key={it.exerciseId}>
                        <span>{byId.get(it.exerciseId)?.name}</span>
                        <span className="muted num">
                          {it.sets} × {it.reps[0]}–{it.reps[1]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className={s.footer}>
        {step < 3 ? (
          <button type="button" className="btn btnPrimary btnBlock btnLg" onClick={() => setStep(step + 1)}>
            Weiter
          </button>
        ) : (
          <>
            <button type="button" className="btn btnPrimary btnBlock btnLg" onClick={() => finish(true)}>
              Plan übernehmen
            </button>
            <button type="button" className="btn btnGhost btnBlock" onClick={() => finish(false)}>
              Ohne Plan fortfahren
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
