import { useRef, useState } from 'react';
import s from './charts.module.css';

export interface LinePoint {
  /** Zeitstempel in ms */
  t: number;
  y: number;
}

interface Props {
  points: LinePoint[];
  formatY: (y: number) => string;
  formatX: (t: number) => string;
  label: string;
  height?: number;
}

const W = 320;
const PAD = { l: 8, r: 8, t: 16, b: 22 };

/** Einfaches Liniendiagramm mit Fadenkreuz und Tooltip. Dazu eine Tabelle für Screenreader. */
export function LineChart({ points, formatY, formatX, label, height = 160 }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  if (!points.length) return null;

  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const padY = (max - min) * 0.15;
  min -= padY;
  max += padY;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const x = (t: number) => (t1 === t0 ? W / 2 : PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(points[best].t) - px)) best = i;
    });
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className={s.wrap}>
      <svg
        ref={ref}
        className={s.svg}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((f) => (
          <line key={f} className={s.grid} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} />
        ))}
        <path className={s.line} d={d} />
        {points.length === 1 && <circle className={s.dot} cx={x(last.t)} cy={y(last.y)} r={4} />}
        {hp ? (
          <>
            <line className={s.cross} x1={x(hp.t)} x2={x(hp.t)} y1={PAD.t - 6} y2={H - PAD.b} />
            <circle className={s.dot} cx={x(hp.t)} cy={y(hp.y)} r={5} />
          </>
        ) : (
          points.length > 1 && <circle className={s.dot} cx={x(last.t)} cy={y(last.y)} r={4.5} />
        )}
        <text className={s.axis} x={PAD.l} y={H - 4}>
          {formatX(t0)}
        </text>
        {t1 !== t0 && (
          <text className={s.axis} x={W - PAD.r} y={H - 4} textAnchor="end">
            {formatX(t1)}
          </text>
        )}
      </svg>
      {hp && (
        <div className={s.tip} style={{ left: `${(x(hp.t) / W) * 100}%`, top: `${(y(hp.y) / H) * 100}%`, marginTop: -10 }}>
          {formatY(hp.y)}
          <span className={s.tipSub}>{formatX(hp.t)}</span>
        </div>
      )}
      <table className="srOnly">
        <caption>{label}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.t}>
              <th scope="row">{formatX(p.t)}</th>
              <td>{formatY(p.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
