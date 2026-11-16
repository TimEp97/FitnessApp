import { BedDouble, Check, Plus } from 'lucide-react';
import { ctx } from '../data';
import type { InterestId } from '../data/schema';
import { codeAt } from '../domain/climate';
import { INTEREST_LABEL } from '../domain/labels';
import type { Scored, Style } from '../domain/types';
import { INTEREST_ICON } from './icons';
import { WeatherPill } from './MonthBar';

interface Props {
  s: Scored;
  month: number;
  style: Style;
  wanted: InterestId[];
  added: boolean;
  onAdd(): void;
}

export function SuggestionCard({ s, month, style, wanted, added, onAdd }: Props) {
  const p = s.place;
  const code = codeAt(ctx.climate(p), month);
  const tags = (Object.keys(p.interests) as InterestId[])
    .sort((a, b) => Number(wanted.includes(b)) - Number(wanted.includes(a)))
    .slice(0, 4);
  return (
    <article className="card sugg">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ ['--gap' as string]: '0' }}>
          <h3 style={{ fontSize: 18 }}>{p.name}</h3>
          <span className="small mute">{ctx.country(p).name}</span>
        </div>
        <span className="match">{s.total} % Match</span>
      </div>
      <WeatherPill code={code} month={month} prefix />
      <div className="row" style={{ ['--gap' as string]: '6px' }}>
        {tags.map((id) => {
          const Icon = INTEREST_ICON[id];
          return <span key={id} className="tag"><Icon size={14} aria-hidden="true" />{INTEREST_LABEL[id]}</span>;
        })}
      </div>
      <span style={{ fontSize: 13.5 }}>{p.tip}</span>
      {s.reasons && <span className="small" style={{ color: 'var(--ink-2)' }}><strong>Warum:</strong> {s.reasons}</span>}
      <div className="stay">
        <BedDouble size={18} color="var(--accent)" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }} />
        <span><strong>Schlafen:</strong> {p.stays[style]}</span>
      </div>
      <button type="button" className={`addbtn${added ? ' act' : ''}`} onClick={onAdd} aria-pressed={added}>
        {added ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        {added ? 'In der Route' : 'Zur Route'}
      </button>
    </article>
  );
}
