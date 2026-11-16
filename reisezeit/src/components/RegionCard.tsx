import { useRef, type KeyboardEvent } from 'react';
import type { ClimateCode, Region } from '../data/schema';
import { summary } from '../domain/climate';
import { CODE_EXPLAIN, CODE_LABEL, MONTHS_FULL, MONTH_LETTERS } from '../i18n/de';
import { Check, MapPin, Plus } from 'lucide-react';
import type { CityEntry } from '../domain/cities';
import { CODE_ICON } from './icons';

interface Props {
  region: Region;
  selected: number; // -1 = keiner
  onSelect(month: number): void;
  cities?: CityEntry[];
  inRoute?: Set<string>;
  onAddPlace?(placeId: string): void;
}

/** Region mit 12 antippbaren Monatszellen und Erklärkasten */
export function RegionCard({ region, selected, onSelect, cities = [], inRoute, onAddPlace }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const code = selected >= 0 ? (region.climate[selected] as ClimateCode) : null;
  const Icon = code ? CODE_ICON[code] : null;
  const focusIdx = selected >= 0 ? selected : 0;

  function onKey(e: KeyboardEvent, i: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + 12) % 12;
    onSelect(next);
    ref.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }

  return (
    <section className="panel stack" style={{ ['--gap' as string]: '10px' }}>
      <div className="stack" style={{ ['--gap' as string]: '2px' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700 }}>{region.name}</h3>
        <span className="small mute">{summary(region.climate)}</span>
      </div>
      {cities.length > 0 && (
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <span className="label">Orte &amp; Highlights</span>
          <ul className="row" style={{ ['--gap' as string]: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
            {cities.map((c) => {
              if (c.placeId && onAddPlace) {
                const added = inRoute?.has(c.placeId) ?? false;
                return (
                  <li key={c.name}>
                    <button type="button" className={`chip city-chip${added ? ' used' : ''}`} disabled={added}
                      onClick={() => onAddPlace(c.placeId!)}
                      aria-label={added ? `${c.name} ist in deiner Route` : `${c.name} zur Route hinzufügen`}>
                      {added ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{c.name}
                    </button>
                  </li>
                );
              }
              return (
                <li key={c.name} className="tag city-tag"><MapPin size={14} aria-hidden="true" />{c.name}</li>
              );
            })}
          </ul>
        </div>
      )}
      <div ref={ref} className="cells" role="group" aria-label={`Monate für ${region.name}`}>
        {[...region.climate].map((c, i) => (
          <button
            key={i}
            type="button"
            className={`cell ${c}`}
            aria-pressed={i === selected}
            aria-label={`${MONTHS_FULL[i]}: ${CODE_LABEL[c as ClimateCode]}`}
            tabIndex={i === focusIdx ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {MONTH_LETTERS[i]}
          </button>
        ))}
      </div>
      {code && Icon && (
        <div className="explain" aria-live="polite">
          <span className={`icon ${code}`}><Icon size={20} aria-hidden="true" /></span>
          <div className="stack" style={{ ['--gap' as string]: '4px' }}>
            <strong>{MONTHS_FULL[selected]} · {CODE_LABEL[code]}</strong>
            <span>{CODE_EXPLAIN[code]}</span>
            {region.note && <span style={{ color: 'var(--ink-2)' }}>{region.note}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
