import type { Exercise } from '../types';
import { poseFor, type Prop } from '../data/illustrations';
import s from './ExerciseImage.module.css';

interface Props {
  exercise: Pick<Exercise, 'id' | 'name' | 'primary' | 'illustration'>;
  size?: 'thumb' | 'md' | 'lg';
  /** dekorativ, wenn der Name daneben steht */
  decorative?: boolean;
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ');

function PropShape({ prop }: { prop: Prop }) {
  switch (prop.k) {
    case 'plate': {
      const r = prop.r ?? 10;
      return (
        <g>
          <circle cx={prop.at[0]} cy={prop.at[1]} r={r} className={s.eq} />
          <circle cx={prop.at[0]} cy={prop.at[1]} r={r * 0.28} className={s.hub} />
        </g>
      );
    }
    case 'db':
      return (
        <g>
          <circle cx={prop.at[0]} cy={prop.at[1]} r={6} className={s.eq} />
          <circle cx={prop.at[0]} cy={prop.at[1]} r={1.8} className={s.hub} />
        </g>
      );
    case 'dbFront':
      return (
        <g className={s.eq}>
          <rect x={prop.at[0] - 9} y={prop.at[1] - 5} width={5} height={10} rx={1.5} />
          <rect x={prop.at[0] + 4} y={prop.at[1] - 5} width={5} height={10} rx={1.5} />
          <rect x={prop.at[0] - 5} y={prop.at[1] - 1.5} width={10} height={3} />
        </g>
      );
    case 'kb':
      return (
        <g>
          <path d={`M${prop.at[0] - 4},${prop.at[1] - 6} a4,4 0 0 1 8,0`} className={s.eqLine} />
          <circle cx={prop.at[0]} cy={prop.at[1] + 1} r={6.5} className={s.eq} />
        </g>
      );
    case 'pad':
      return <circle cx={prop.at[0]} cy={prop.at[1]} r={prop.r ?? 5} className={s.eq} />;
    case 'line':
      return <polyline points={pts(prop.p)} className={prop.eq ? s.eqLine : s.propLine} style={{ strokeWidth: prop.w ?? 4 }} />;
    case 'rect':
      return <rect x={prop.x} y={prop.y} width={prop.w} height={prop.h} rx={2} className={prop.eq ? s.eq : s.prop} />;
  }
}

/** Piktogramm einer Übung. Eine hinterlegte Grafik (`illustration`) hat Vorrang. */
export function ExerciseImage({ exercise, size = 'md', decorative }: Props) {
  const label = `Illustration: ${exercise.name}`;
  if (exercise.illustration) {
    return <img className={`${s.frame} ${s[size]}`} src={exercise.illustration} alt={decorative ? '' : label} />;
  }
  const pose = poseFor(exercise);
  return (
    <svg
      className={`${s.frame} ${s[size]}`}
      viewBox="0 0 160 120"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      data-testid="exercise-image"
    >
      {!pose.noFloor && <line x1={8} y1={114.5} x2={152} y2={114.5} className={s.floor} />}
      {pose.props.map((p, i) => (
        <PropShape key={`p${i}`} prop={p} />
      ))}
      {pose.limbs
        .filter((l) => l.far)
        .map((l, i) => (
          <polyline key={`f${i}`} points={pts(l.p)} className={`${s.limb} ${s.far}`} style={{ strokeWidth: l.w ?? 7 }} />
        ))}
      {pose.limbs
        .filter((l) => !l.far)
        .map((l, i) => (
          <polyline key={`l${i}`} points={pts(l.p)} className={s.limb} style={{ strokeWidth: l.w ?? 7 }} />
        ))}
      <circle cx={pose.head[0]} cy={pose.head[1]} r={7.5} className={s.head} />
      {pose.front?.map((p, i) => (
        <PropShape key={`fr${i}`} prop={p} />
      ))}
    </svg>
  );
}
