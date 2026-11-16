import type { Months12 } from '../data/schema';
import { CODE_LABEL, MONTHS_FULL, MONTH_LETTERS } from '../i18n/de';
import type { ClimateCode } from '../data/schema';

/** 12er-Farbleiste (Jan–Dez); für Screenreader als Text zusammengefasst */
export function MonthBar({ code, highlight, label }: { code: Months12; highlight?: number; label?: string }) {
  const text = [...code].map((c, i) => `${MONTHS_FULL[i]}: ${CODE_LABEL[c as ClimateCode]}`).join(', ');
  return (
    <div role="img" aria-label={`${label ? label + ' – ' : ''}${text}`}>
      <div className="monthbar">
        {[...code].map((c, i) => (
          <span key={i} className={`${c}${i === highlight ? ' hl' : ''}`} />
        ))}
      </div>
      <div className="monthletters" aria-hidden="true">
        {MONTH_LETTERS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}

export function WeatherPill({ code, month, prefix }: { code: ClimateCode; month?: number; prefix?: boolean }) {
  const text = prefix && month !== undefined ? `${MONTHS_FULL[month]}: ${CODE_LABEL[code]}` : CODE_LABEL[code];
  return <span className={`pill ${code}`}>{text}</span>;
}
