import { useMemo, useState } from 'react';
import type { Exercise, ID } from '../types';
import { useExercises } from '../stores/exercises';
import { EQUIPMENT_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL } from '../data/labels';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import s from './ExercisePicker.module.css';
import { ExerciseImage } from './ExerciseImage';

export function filterExercises(list: Exercise[], query: string, group: string | null, equipment?: string | null): Exercise[] {
  const q = query.trim().toLocaleLowerCase('de');
  const muscles = MUSCLE_GROUPS.find((g) => g.id === group)?.muscles;
  return list.filter(
    (e) =>
      (!q || e.name.toLocaleLowerCase('de').includes(q) || [...e.primary, ...e.secondary].some((m) => MUSCLE_LABEL[m].toLocaleLowerCase('de').includes(q))) &&
      (!muscles || e.primary.some((m) => muscles.includes(m))) &&
      (!equipment || e.equipment === equipment),
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (id: ID) => void;
  /** bereits enthaltene Übungen werden markiert */
  existing?: Set<ID>;
  title?: string;
}

export function ExercisePicker({ open, onClose, onPick, existing, title = 'Übung hinzufügen' }: Props) {
  const exercises = useExercises((st) => st.exercises);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const list = useMemo(() => filterExercises(exercises, query, group), [exercises, query, group]);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <label className="srOnly" htmlFor="picker-search">
        Übung suchen
      </label>
      <input
        id="picker-search"
        className="input"
        type="search"
        placeholder="Suchen, z. B. Bankdrücken"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <div className="chips" role="group" aria-label="Muskelgruppe">
        {MUSCLE_GROUPS.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={group === g.id} onClick={() => setGroup(group === g.id ? null : g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      <ul className="list">
        {list.map((e) => {
          const has = existing?.has(e.id);
          return (
            <li key={e.id}>
              <button type="button" className={`listRow ${s.item}`} onClick={() => onPick(e.id)} data-testid="picker-item">
                <ExerciseImage exercise={e} size="thumb" decorative />
                <span className="spacer">
                  <span className={s.name}>{e.name}</span>
                  <span className="muted small" style={{ display: 'block' }}>
                    {e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · {EQUIPMENT_LABEL[e.equipment]}
                  </span>
                </span>
                {has ? <span className="muted small">im Plan</span> : <Icon name="plus" />}
              </button>
            </li>
          );
        })}
        {!list.length && <li className="muted">Keine Übung gefunden.</li>}
      </ul>
    </Sheet>
  );
}
