import s from './Segmented.module.css';

interface Props<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

/** Umschalter aus echten Buttons mit aria-pressed. */
export function Segmented<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={s.item} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
