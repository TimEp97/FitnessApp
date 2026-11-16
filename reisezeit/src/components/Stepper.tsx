import { t } from '../i18n/de';

export function Stepper({ step, maxDone, onPick }: { step: number; maxDone: number; onPick(step: number): void }) {
  return (
    <nav aria-label="Schritte">
      <ol className="stepper" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {t.steps.map((label, i) => {
          const n = i + 1;
          return (
            <li key={n}>
              <button
                type="button"
                className={`step${n < step || n <= maxDone ? ' done' : ''}`}
                aria-current={n === step ? 'step' : undefined}
                onClick={() => onPick(n)}
              >
                <span className="num">{n}</span>{label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
