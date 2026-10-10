import { useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import s from './SortableList.module.css';

interface Props<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  getLabel: (item: T) => string;
  onMove: (from: number, to: number) => void;
  render: (item: T, index: number) => ReactNode;
}

/** Liste, die per Ziehen am Griff sortiert wird. Mit Tastatur: Griff fokussieren, Pfeil hoch/runter. */
export function SortableList<T>({ items, getKey, getLabel, onMove, render }: Props<T>) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = i;
    setDragging(i);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const from = draggingRef.current;
    if (from === null) return;
    const y = e.clientY;
    let to = from;
    refs.current.forEach((el, idx) => {
      if (!el || idx === from) return;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (idx < from && y < mid) to = Math.min(to, idx);
      if (idx > from && y > mid) to = Math.max(to, idx);
    });
    if (to !== from) {
      onMove(from, to);
      draggingRef.current = to;
      setDragging(to);
    }
  };

  const end = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  return (
    <ul className={`list ${s.list}`}>
      {items.map((item, i) => (
        <li key={getKey(item, i)} ref={(el) => (refs.current[i] = el)} className={`${s.item} ${dragging === i ? s.dragging : ''}`}>
          <button
            type="button"
            className={s.handle}
            aria-label={`${getLabel(item)} verschieben (Position ${i + 1} von ${items.length}). Pfeiltasten hoch und runter.`}
            onPointerDown={onPointerDown(i)}
            onPointerMove={onPointerMove}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' && i > 0) {
                e.preventDefault();
                onMove(i, i - 1);
              }
              if (e.key === 'ArrowDown' && i < items.length - 1) {
                e.preventDefault();
                onMove(i, i + 1);
              }
            }}
          >
            <Icon name="drag" strokeWidth={3} />
          </button>
          <div className={s.content}>{render(item, i)}</div>
        </li>
      ))}
    </ul>
  );
}
