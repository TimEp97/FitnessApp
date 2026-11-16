import { useRef } from 'react';
import { Star } from 'lucide-react';
import { interests } from '../data';
import type { InterestId } from '../data/schema';
import { INTEREST_ICON } from './icons';

interface Props {
  selected: InterestId[];
  mustHave?: InterestId;
  onToggle(id: InterestId): void;
  onMust(id: InterestId): void;
}

/**
 * Vorlieben als Umschalter. Tippen: an → „Muss“ (Stern, max. eine) → aus.
 * Langes Drücken markiert direkt als „Muss“.
 */
export function InterestTiles({ selected, mustHave, onToggle, onMust }: Props) {
  const timer = useRef<number>();
  const longPressed = useRef(false);

  const start = (id: InterestId) => {
    longPressed.current = false;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onMust(id);
    }, 550);
  };
  const cancel = () => window.clearTimeout(timer.current);

  return (
    <div className="stack" style={{ ['--gap' as string]: '8px' }}>
      <div className="tiles" role="group" aria-label="Vorlieben">
        {interests.map((i) => {
          const Icon = INTEREST_ICON[i.id];
          const on = selected.includes(i.id);
          const must = mustHave === i.id;
          return (
            <button
              key={i.id}
              type="button"
              className="tile"
              aria-pressed={on}
              aria-label={`${i.label}${must ? ' (Muss)' : ''}`}
              onPointerDown={() => start(i.id)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                onToggle(i.id);
              }}
            >
              <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              <span>{i.label}</span>
              {must && <span className="star"><Star size={12} fill="currentColor" aria-hidden="true" />Muss</span>}
            </button>
          );
        })}
      </div>
      <span className="small mute">Nochmal tippen (oder lange drücken) macht eine Vorliebe zum „Muss“ – höchstens eine.</span>
    </div>
  );
}
