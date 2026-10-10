import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { fmtWeight, parseNumber } from '../logic/format';
import s from './Stepper.module.css';

interface Props {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min: number;
  max: number;
  unit?: string;
  /** Startwert, wenn das Feld leer ist und Plus getippt wird */
  emptyStart?: number;
  size?: 'lg' | 'sm';
  error?: string;
  /** Dezimalzahlen erlauben */
  decimal?: boolean;
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Minus-Taste, großer Wert, Plus-Taste. Tipp auf den Wert öffnet die Zifferntastatur. */
export function Stepper({ label, value, onChange, step, min, max, unit, emptyStart, size = 'lg', error, decimal }: Props) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (text.trim() === '') {
      setLocalError('');
      return;
    }
    const n = parseNumber(text);
    if (Number.isNaN(n) || (!decimal && !Number.isInteger(n))) {
      setLocalError(decimal ? 'Bitte eine Zahl eingeben, z. B. 82,5.' : 'Bitte eine ganze Zahl eingeben.');
      return;
    }
    setLocalError('');
    onChange(round(n));
  };

  const bump = (dir: 1 | -1) => {
    setLocalError('');
    if (value === null) {
      onChange(dir > 0 ? (emptyStart ?? step) : min);
      return;
    }
    onChange(round(Math.min(max, Math.max(min, value + dir * step))));
  };

  const shown = value === null ? '–' : decimal ? fmtWeight(value) : String(value);
  const msg = localError || error;
  const errId = `${id}-err`;

  return (
    <div className={`${s.wrap} ${size === 'sm' ? s.sm : ''}`}>
      <div className={s.row}>
        <button type="button" className={s.btn} onClick={() => bump(-1)} aria-label={`${label} verringern`} disabled={value !== null && value <= min}>
          <Icon name="minus" size={size === 'sm' ? 20 : 26} />
        </button>
        <div className={s.center}>
          {editing ? (
            <input
              ref={inputRef}
              id={id}
              className={`num ${s.input}`}
              inputMode={decimal ? 'decimal' : 'numeric'}
              value={text}
              aria-label={label}
              aria-invalid={Boolean(msg)}
              aria-describedby={msg ? errId : undefined}
              onChange={(e) => setText(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          ) : (
            <button
              type="button"
              className={`num ${s.value}`}
              onClick={() => {
                setText(value === null ? '' : shown);
                setEditing(true);
              }}
              aria-label={`${label}: ${value === null ? 'leer' : `${shown}${unit ? ` ${unit}` : ''}`}. Tippen für direkte Eingabe.`}
              aria-invalid={Boolean(msg)}
              aria-describedby={msg ? errId : undefined}
              data-testid={`stepper-${label}`}
            >
              {shown}
            </button>
          )}
          <span className={s.unit}>{unit ? `${label} · ${unit}` : label}</span>
        </div>
        <button type="button" className={s.btn} onClick={() => bump(1)} aria-label={`${label} erhöhen`} disabled={value !== null && value >= max}>
          <Icon name="plus" size={size === 'sm' ? 20 : 26} />
        </button>
      </div>
      {msg && (
        <p id={errId} className="fieldError" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
