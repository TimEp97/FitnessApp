import { useState } from 'react';
import s from './charts.module.css';

export interface Bar {
  label: string;
  value: number;
  /** Text im Tooltip und in der Tabelle */
  display: string;
  variant?: 'normal' | 'muted' | 'dashed';
  /** Achsenbeschriftung hervorheben (z. B. heute) */
  emphasize?: boolean;
}

interface Props {
  bars: Bar[];
  label: string;
  height?: number;
  /** gestrichelte Ziellinie */
  target?: number;
  /** Mindesthöhe für gestrichelte Balken (Anteil der Höhe) */
  placeholderHeight?: number;
}

const W = 320;
const PAD = { t: 10, b: 22 };

/** Balkendiagramm mit abgerundeten Enden, 2 px Abstand, Tooltip auf Tipp. */
export function BarChart({ bars, label, height = 140, target, placeholderHeight = 0.35 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const H = height;
  const max = Math.max(1e-6, target ?? 0, ...bars.map((b) => b.value)) * 1.08;
  const n = bars.length;
  const slot = W / n;
  const bw = Math.min(28, slot * 0.62);
  const plotH = H - PAD.t - PAD.b;
  const yOf = (v: number) => PAD.t + plotH * (1 - v / max);
  const r = Math.min(4, bw / 2);
  // höchstens etwa 8 Beschriftungen, die letzte immer
  const every = Math.ceil(n / 8);
  const showLabel = (i: number) => n <= 8 || i === n - 1 || (i % every === 0 && n - 1 - i >= every);

  const barPath = (x: number, top: number, bottom: number) => {
    const h = bottom - top;
    if (h <= 0) return '';
    const rr = Math.min(r, h);
    return `M${x},${bottom} L${x},${top + rr} Q${x},${top} ${x + rr},${top} L${x + bw - rr},${top} Q${x + bw},${top} ${x + bw},${top + rr} L${x + bw},${bottom} Z`;
  };

  return (
    <div className={s.wrap}>
      <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" onPointerLeave={() => setActive(null)}>
        <line className={s.grid} x1={0} x2={W} y1={H - PAD.b} y2={H - PAD.b} />
        {target !== undefined && target > 0 && <line className={s.target} x1={0} x2={W} y1={yOf(target)} y2={yOf(target)} />}
        {bars.map((b, i) => {
          const x = i * slot + (slot - bw) / 2;
          const bottom = H - PAD.b - 1;
          const variant = b.variant ?? 'normal';
          const top = variant === 'dashed' ? bottom - plotH * placeholderHeight : yOf(b.value);
          const cls = variant === 'dashed' ? s.barDashed : variant === 'muted' ? s.barMuted : s.bar;
          return (
            <g key={i}>
              {variant === 'dashed' ? (
                <rect className={cls} x={x + 0.75} y={top} width={bw - 1.5} height={bottom - top} rx={r} />
              ) : (
                b.value > 0 && <path className={`${cls} ${active === i ? s.barActive : ''}`} d={barPath(x, top, bottom)} />
              )}
              <text className={`${s.axis} ${b.emphasize ? s.axisToday : ''}`} x={x + bw / 2} y={H - 6} textAnchor="middle">
                {showLabel(i) ? b.label : ''}
              </text>
              <rect className={s.hit} x={i * slot} y={0} width={slot} height={H} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} />
            </g>
          );
        })}
      </svg>
      {active !== null && (
        <div
          className={s.tip}
          style={{ left: `${((active * slot + slot / 2) / W) * 100}%`, top: `${(Math.min(yOf(bars[active].value), H - PAD.b - 20) / H) * 100}%`, marginTop: -6 }}
        >
          {bars[active].display}
          <span className={s.tipSub}>{bars[active].label}</span>
        </div>
      )}
      <table className="srOnly">
        <caption>{label}</caption>
        <tbody>
          {bars.map((b, i) => (
            <tr key={i}>
              <th scope="row">{b.label}</th>
              <td>{b.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
