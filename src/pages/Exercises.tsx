import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Equipment, Exercise, Level, MuscleId } from '../types';
import { useExercises } from '../stores/exercises';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { filterExercises } from '../components/ExercisePicker';
import { EQUIPMENT, EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLES, MUSCLE_GROUPS, MUSCLE_LABEL } from '../data/labels';
import { uid } from '../logic/dates';
import s from './Exercises.module.css';

export function Exercises() {
  const exercises = useExercises((st) => st.exercises);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const list = useMemo(() => filterExercises(exercises, query, group, equipment), [exercises, query, group, equipment]);

  return (
    <Page
      title="Übungen"
      back={
        <Link to="/training" className="btnLink">
          <Icon name="chevronLeft" size={20} /> Training
        </Link>
      }
      actions={
        <button type="button" className="btn" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={20} /> Eigene
        </button>
      }
    >
      <div className={s.search}>
        <Icon name="search" className={s.searchIcon} />
        <label className="srOnly" htmlFor="ex-search">
          Übungen durchsuchen
        </label>
        <input id="ex-search" className={`input ${s.searchInput}`} type="search" placeholder="Übung oder Muskel suchen" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </div>
      <div className="chips" role="group" aria-label="Nach Muskelgruppe filtern">
        {MUSCLE_GROUPS.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={group === g.id} onClick={() => setGroup(group === g.id ? null : g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Nach Equipment filtern">
        {EQUIPMENT.map((e) => (
          <button key={e} type="button" className="chip" aria-pressed={equipment === e} onClick={() => setEquipment(equipment === e ? null : e)}>
            {EQUIPMENT_LABEL[e]}
          </button>
        ))}
      </div>
      <p className="muted small" aria-live="polite">
        {list.length} {list.length === 1 ? 'Übung' : 'Übungen'}
      </p>
      <ul className={`list card ${s.list}`}>
        {list.map((e) => (
          <li key={e.id}>
            <Link to={`/uebungen/${e.id}`} className="listRow">
              <span className="spacer">
                <span className={s.name}>
                  {e.name}
                  {e.custom && <span className={s.custom}>Eigene</span>}
                </span>
                <span className="muted small" style={{ display: 'block' }}>
                  {e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · {EQUIPMENT_LABEL[e.equipment]}
                </span>
              </span>
              <Icon name="chevronRight" className="muted" />
            </Link>
          </li>
        ))}
        {!list.length && <li className="muted">Keine Übung passt zu Suche und Filtern.</li>}
      </ul>
      <CreateExerciseSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </Page>
  );
}

function CreateExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [level, setLevel] = useState<Level>('beginner');
  const [primary, setPrimary] = useState<MuscleId[]>([]);
  const [secondary, setSecondary] = useState<MuscleId[]>([]);
  const [errors, setErrors] = useState<{ name?: string; primary?: string }>({});

  const toggle = (list: MuscleId[], m: MuscleId) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);

  const save = async () => {
    const e = {
      name: name.trim().length < 2 ? 'Bitte einen Namen mit mindestens 2 Zeichen eingeben.' : undefined,
      primary: primary.length ? undefined : 'Bitte mindestens einen primären Muskel wählen.',
    };
    setErrors(e);
    if (e.name || e.primary) return;
    const ex: Exercise = {
      id: `custom-${uid()}`,
      name: name.trim(),
      equipment,
      level,
      primary,
      secondary: secondary.filter((m) => !primary.includes(m)),
      steps: [],
      breathing: '',
      mistakes: [],
      recommended: { sets: [3, 4], reps: [8, 12] },
      weightStep: equipment === 'machine' ? 5 : equipment === 'dumbbell' ? 2 : 2.5,
      custom: true,
    };
    await useExercises.getState().add(ex);
    setName('');
    setPrimary([]);
    setSecondary([]);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Eigene Übung">
      <div>
        <label className="fieldLabel" htmlFor="new-name">
          Name
        </label>
        <input id="new-name" className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'new-name-err' : undefined} maxLength={60} />
        {errors.name && (
          <p id="new-name-err" className="fieldError">
            {errors.name}
          </p>
        )}
      </div>
      <fieldset className={s.fieldset}>
        <legend className="fieldLabel">Equipment</legend>
        <div className="chipsWrap">
          {EQUIPMENT.map((e) => (
            <button key={e} type="button" className="chip" aria-pressed={equipment === e} onClick={() => setEquipment(e)}>
              {EQUIPMENT_LABEL[e]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={s.fieldset}>
        <legend className="fieldLabel">Schwierigkeit</legend>
        <div className="chipsWrap">
          {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={s.fieldset} aria-describedby={errors.primary ? 'new-primary-err' : undefined}>
        <legend className="fieldLabel">Primäre Muskeln</legend>
        <div className="chipsWrap">
          {MUSCLES.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={primary.includes(m)} onClick={() => setPrimary(toggle(primary, m))}>
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
        {errors.primary && (
          <p id="new-primary-err" className="fieldError">
            {errors.primary}
          </p>
        )}
      </fieldset>
      <fieldset className={s.fieldset}>
        <legend className="fieldLabel">Sekundäre Muskeln (optional)</legend>
        <div className="chipsWrap">
          {MUSCLES.filter((m) => !primary.includes(m)).map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={secondary.includes(m)} onClick={() => setSecondary(toggle(secondary, m))}>
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="button" className="btn btnPrimary btnBlock btnLg" onClick={save}>
        Übung anlegen
      </button>
    </Sheet>
  );
}
