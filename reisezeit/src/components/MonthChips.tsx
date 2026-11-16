import { useRef, type KeyboardEvent } from 'react';
import { MONTHS, t } from '../i18n/de';

interface Props {
  value: number; // -1 = jederzeit
  onChange(month: number): void;
  allowAny?: boolean;
  label?: string;
  scroll?: boolean;
}

/** Monatsauswahl als Chips. Pfeiltasten wechseln den Monat (Roving Tabindex). */
export function MonthChips({ value, onChange, allowAny, label = 'Reisemonat', scroll }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const values = allowAny ? [-1, ...MONTHS.map((_, i) => i)] : MONTHS.map((_, i) => i);
  const current = values.includes(value) ? value : values[0];

  function onKey(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? values.length - 1 : -1;
    if (!dir && jump < 0) return;
    e.preventDefault();
    const next = jump >= 0 ? jump : (idx + dir + values.length) % values.length;
    onChange(values[next]);
    ref.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }

  return (
    <div ref={ref} className={scroll ? 'chip-scroller' : 'row'} style={{ ['--gap' as string]: '6px' }} role="group" aria-label={label}>
      {values.map((m, i) => (
        <button
          key={m}
          type="button"
          className="chip"
          aria-pressed={m === value}
          tabIndex={m === current ? 0 : -1}
          onClick={() => onChange(m)}
          onKeyDown={(e) => onKey(e, i)}
          style={{ padding: '0 11px' }}
        >
          {m < 0 ? t.anytime : MONTHS[m]}
        </button>
      ))}
    </div>
  );
}

/** Einfache Chip-Gruppe mit einer Auswahl */
export function ChipGroup<T extends string | number>({
  options, value, onChange, label,
}: { options: { value: T; label: string }[]; value: T; onChange(v: T): void; label: string }) {
  return (
    <div className="stack" style={{ ['--gap' as string]: '6px', minWidth: 0 }}>
      <span className="label">{label}</span>
      <div className="row" style={{ ['--gap' as string]: '6px' }} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)} style={{ padding: '0 12px' }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
