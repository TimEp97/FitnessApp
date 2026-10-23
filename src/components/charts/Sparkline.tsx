import s from './charts.module.css';

interface Props {
  values: number[];
  width?: number;
  height?: number;
}

/** Kleine Verlaufslinie ohne Achsen, rein dekorativ neben einer Zahl. */
export function Sparkline({ values, width = 80, height = 28 }: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path className={s.line} d={d} />
    </svg>
  );
}
