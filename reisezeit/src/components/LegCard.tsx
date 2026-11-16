import { useRef, type KeyboardEvent } from 'react';
import type { Leg } from '../domain/timeline';
import { formatHours, type TransportKind } from '../domain/transport';
import { TRANSPORT_ICON } from './icons';

/** Eine Strecke mit großen Optionskacheln (Radiogruppe) */
export function LegCard({ leg, onPick }: { leg: Leg; onPick(kind: TransportKind): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const opts = leg.info.options;
  const idx = Math.max(0, opts.findIndex((o) => o.kind === leg.chosen.kind));

  function onKey(e: KeyboardEvent, i: number) {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + opts.length) % opts.length;
    onPick(opts[next].kind);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[next]?.focus();
  }

  const title = `${leg.from.name} → ${leg.to.name}`;
  return (
    <section className="panel stack" style={{ ['--gap' as string]: '10px' }}>
      <div className="row" style={{ ['--gap' as string]: '10px', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 16, fontFamily: 'var(--font-body)' }}>{title}</h3>
        <span className="small mute">Luftlinie ca. {Math.round(leg.info.km / 10) * 10} km</span>
      </div>
      <div ref={ref} className="row" style={{ ['--gap' as string]: '8px' }} role="radiogroup" aria-label={`Verkehrsmittel ${title}`}>
        {opts.map((o, i) => {
          const Icon = TRANSPORT_ICON[o.kind];
          const on = o.kind === leg.chosen.kind;
          return (
            <button
              key={o.kind}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === idx ? 0 : -1}
              className="opt"
              onClick={() => onPick(o.kind)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              <span className="stack" style={{ ['--gap' as string]: '1px' }}>
                <span style={{ fontWeight: 600 }}>{o.label}</span>
                <span className="small mute">{formatHours(o.hours)}</span>
                {o.recommended && <span className="rec">Empfohlen</span>}
              </span>
            </button>
          );
        })}
      </div>
      <span className="small" style={{ color: 'var(--ink-2)' }}>{leg.chosen.note}</span>
    </section>
  );
}
