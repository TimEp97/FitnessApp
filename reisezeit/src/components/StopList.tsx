import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus, X } from 'lucide-react';
import { countries, ctx, places } from '../data';
import type { ClimateCode } from '../data/schema';
import { codeAt } from '../domain/climate';
import { nightsLabel } from '../domain/timeline';
import { CODE_LABEL, MONTHS_FULL } from '../i18n/de';
import type { Stop } from '../domain/types';
import { WeatherPill } from './MonthBar';

interface ListProps {
  stops: Stop[];
  month: number;
  onNights(i: number, n: number): void;
  onMove(from: number, to: number): void;
  onRemove(i: number): void;
}

export function StopList({ stops, month, onNights, onMove, onRemove }: ListProps) {
  const total = stops.reduce((s, x) => s + x.nights, 0);
  return (
    <div className="stack" style={{ ['--gap' as string]: '10px' }}>
      <h3 style={{ fontSize: 16, fontFamily: 'var(--font-body)' }} aria-live="polite">
        Deine Route · {stops.length} {stops.length === 1 ? 'Stopp' : 'Stopps'} · {nightsLabel(total)}
      </h3>
      {stops.length === 0 && <div className="empty">Noch keine Orte – füge rechts einen Ort hinzu.</div>}
      <ol className="stack" style={{ ['--gap' as string]: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        {stops.map((s, i) => {
          const p = ctx.place(s.placeId);
          if (!p) return null;
          const code = codeAt(ctx.climate(p), month);
          return (
            <li key={s.placeId} className="card stop-row">
              <span className="num-badge" aria-hidden="true">{i + 1}</span>
              <div className="grow stack" style={{ ['--gap' as string]: '2px', flex: '1 1 140px' }}>
                <strong>{p.name}</strong>
                <span className="small mute row" style={{ ['--gap' as string]: '6px' }}>
                  {ctx.country(p).name} <WeatherPill code={code} />
                </span>
              </div>
              <div className="row" style={{ ['--gap' as string]: '6px' }} role="group" aria-label={`Nächte in ${p.name}`}>
                <button type="button" className="ibtn" disabled={s.nights <= 1} onClick={() => onNights(i, s.nights - 1)} aria-label={`Eine Nacht weniger in ${p.name}`}><Minus size={18} aria-hidden="true" /></button>
                <span style={{ minWidth: 74, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>{nightsLabel(s.nights)}</span>
                <button type="button" className="ibtn" disabled={s.nights >= 21} onClick={() => onNights(i, s.nights + 1)} aria-label={`Eine Nacht mehr in ${p.name}`}><Plus size={18} aria-hidden="true" /></button>
              </div>
              <div className="row" style={{ ['--gap' as string]: '4px' }}>
                <button type="button" className="ibtn" disabled={i === 0} onClick={() => onMove(i, i - 1)} aria-label={`${p.name} nach oben`}><ChevronUp size={18} aria-hidden="true" /></button>
                <button type="button" className="ibtn" disabled={i === stops.length - 1} onClick={() => onMove(i, i + 1)} aria-label={`${p.name} nach unten`}><ChevronDown size={18} aria-hidden="true" /></button>
                <button type="button" className="ibtn" onClick={() => onRemove(i)} aria-label={`${p.name} entfernen`}><X size={18} aria-hidden="true" /></button>
              </div>
              <span className="sr-only">{MONTHS_FULL[month]}: {CODE_LABEL[code as ClimateCode]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const plannerCountries = countries.filter((c) => places.some((p) => p.countryId === c.id));

export function PlaceAdder({ stops, month, onAdd }: { stops: Stop[]; month: number; onAdd(id: string): void }) {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState<string>('alle');
  const chosen = new Set(stops.map((s) => s.placeId));
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return places.filter((p) => {
      if (country !== 'alle' && p.countryId !== country) return false;
      if (!ql) return true;
      const hay = `${p.name} ${ctx.country(p).name} ${p.tip} ${Object.keys(p.interests).join(' ')} ${p.transport.island ? 'insel' : ''}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [q, country]);

  return (
    <div className="panel stack" style={{ ['--gap' as string]: '10px' }}>
      <h3 style={{ fontSize: 16, fontFamily: 'var(--font-body)' }}>Ort hinzufügen</h3>
      <label htmlFor="ortsuche" className="small mute">Ort suchen</label>
      <input id="ortsuche" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="z. B. Hoi An, Lofoten, Insel, surfen …" />
      <div className="row" style={{ ['--gap' as string]: '6px' }} role="group" aria-label="Land">
        <button type="button" className="chip" aria-pressed={country === 'alle'} onClick={() => setCountry('alle')}>Alle</button>
        {plannerCountries.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={country === c.id} onClick={() => setCountry(c.id)}>{c.name}</button>
        ))}
      </div>
      <div className="row" style={{ ['--gap' as string]: '6px' }}>
        {list.map((p) => {
          const code = codeAt(ctx.climate(p), month);
          const used = chosen.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={`chip${used ? ' used' : ''}`}
              disabled={used}
              onClick={() => onAdd(p.id)}
              aria-label={`${p.name} hinzufügen – ${MONTHS_FULL[month]}: ${CODE_LABEL[code]}${used ? ' (schon in der Route)' : ''}`}
            >
              <span className={`dot ${code}`} aria-hidden="true" />{p.name}
              <span className="tiny mute">{p.countryId.toUpperCase()}</span>
            </button>
          );
        })}
        {!list.length && <span className="small mute">Kein Ort gefunden.</span>}
      </div>
    </div>
  );
}
