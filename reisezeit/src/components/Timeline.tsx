import { BedDouble, PlaneTakeoff } from 'lucide-react';
import { ctx } from '../data';
import type { Style } from '../domain/types';
import { placeImage } from '../images';
import type { Plan } from '../domain/timeline';
import { dayLabel, nightsLabel } from '../domain/timeline';
import { formatHours } from '../domain/transport';
import { TRANSPORT_COLOR, TRANSPORT_ICON } from './icons';
import { WeatherPill } from './MonthBar';

export function Timeline({ plan, month, style = 'komfort' }: { plan: Plan; month: number; style?: Style }) {
  return (
    <ol className="timeline" aria-label="Tagesablauf">
      {plan.items.map((it, k) => {
        if (it.type === 'stop') {
          return (
            <li key={k} className="card tl-stop">
              <span className="tl-photo">
                <img src={placeImage(it.place, ctx.country(it.place)).src} alt="" loading="lazy" />
                <span className="num-badge" aria-hidden="true">{it.index + 1}</span>
              </span>
              <div className="stack" style={{ ['--gap' as string]: '3px', minWidth: 0 }}>
                <span className="small mute" style={{ fontWeight: 600 }}>{dayLabel(it.fromDay, it.toDay)} · {nightsLabel(it.nights)}</span>
                <strong style={{ fontSize: 16 }}>{it.place.name}</strong>
                <span style={{ fontSize: 13.5 }}>{it.place.tip}</span>
                <span className="small mute" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><BedDouble size={15} aria-hidden="true" />{it.place.stays[style]}</span>
                <WeatherPill code={it.code} month={month} prefix />
              </div>
            </li>
          );
        }
        if (it.type === 'leg') {
          const Icon = TRANSPORT_ICON[it.leg.chosen.kind];
          return (
            <li key={k} className="tl-leg">
              <span style={{ width: 24, display: 'inline-flex', justifyContent: 'center', color: TRANSPORT_COLOR[it.leg.chosen.kind] }}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span><strong>Tag {it.day}:</strong> {it.leg.chosen.label} nach {it.leg.to.name} · {formatHours(it.leg.chosen.hours)}</span>
            </li>
          );
        }
        return (
          <li key={k} className="tl-leg">
            <span style={{ width: 24, display: 'inline-flex', justifyContent: 'center' }}><PlaneTakeoff size={22} aria-hidden="true" /></span>
            <span><strong>Tag {it.day}:</strong> Rückreise ab {it.place.name}</span>
          </li>
        );
      })}
    </ol>
  );
}
