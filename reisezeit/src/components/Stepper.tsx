const STEPS = [
  { n: 1, label: 'Wünsche' },
  { n: 4, label: 'Reiseplan' },
];
const SUB: Record<number, string> = { 2: 'Orte anpassen', 3: 'Verkehrsmittel anpassen' };

/** Zwei Hauptschritte: Wünsche → Reiseplan. Orte und Verkehrsmittel sind optionale Anpassungen des Plans. */
export function Stepper({ step, hasPlan, onPick }: { step: number; hasPlan: boolean; onPick(step: number): void }) {
  const current = step === 1 ? 1 : 4;
  const idx = current === 1 ? 1 : 2;
  const title = SUB[step] ? `Reiseplan · ${SUB[step]}` : STEPS[idx - 1].label;
  return (
    <nav aria-label="Schritte" className="stepper-nav">
      <p className="stepper-mobile-title" aria-hidden="true">Schritt {idx} von 2 · <strong>{title}</strong></p>
      <ol className="stepper" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {STEPS.map((s, i) => (
          <li key={s.n}>
            <button
              type="button"
              className={`step${(s.n === 1 && current === 4) || (s.n === 4 && hasPlan && current === 1) ? ' done' : ''}`}
              aria-current={s.n === current ? 'step' : undefined}
              onClick={() => onPick(s.n)}
            >
              <span className="num">{i + 1}</span><span className="step-label">{s.label}{s.n === 4 && SUB[step] ? ` · ${SUB[step]}` : ''}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
