import type { MuscleId } from '../types';
import { MUSCLE_LABEL } from '../data/labels';
import s from './BodyMap.module.css';

interface Shape {
  m: MuscleId;
  d: string;
  /** zusätzlich gespiegelt auf der rechten Körperseite zeichnen */
  mirror?: boolean;
}

// Vereinfachte Figur (100 × 185), linke Körperhälfte wird gespiegelt.
const FRONT: Shape[] = [
  { m: 'traps', mirror: true, d: 'M45.5,26 C44,29 41,31 37,32.5 L46,32 Z' },
  { m: 'deltsSide', mirror: true, d: 'M35,32 C29,32 25.5,35.5 24.5,42 C24.3,44 24.5,46 25,47.5 L28.5,45.5 C28.5,40 30.5,36 35.5,33.5 Z' },
  { m: 'deltsFront', mirror: true, d: 'M36,33.5 C31.5,35.5 29.5,39.5 29,45.5 L32.5,47 C33,42 34.5,38.5 38,36 Z' },
  { m: 'chest', mirror: true, d: 'M38.5,35.5 C42,34 46,33.5 49.5,33.8 L49.5,50 C45,51.5 39,51 34,48 C33.5,42.5 35,38 38.5,35.5 Z' },
  { m: 'biceps', mirror: true, d: 'M24.8,48.5 L28.7,46.5 L32.4,48 C32.6,54 31.5,60 29.5,64 L24,63.5 C23,58.5 23.3,53 24.8,48.5 Z' },
  { m: 'forearms', mirror: true, d: 'M23.6,65.5 L29.5,66 C29.8,73 28.2,80 26.2,86.5 L21.4,86 C20.5,79 21.4,71.5 23.6,65.5 Z' },
  { m: 'abs', d: 'M44,53 L56,53 C56.5,63 56.5,73 55.5,83 C53.5,86.5 46.5,86.5 44.5,83 C43.5,73 43.5,63 44,53 Z' },
  { m: 'obliques', mirror: true, d: 'M34.5,50.5 C37.5,52.5 40.5,53.5 42.8,53.6 C42.3,63 42.4,73 43.3,82.5 C40,81 37,78 35.2,73.5 C34,66 34,58 34.5,50.5 Z' },
  { m: 'quads', mirror: true, d: 'M35,89 C38.5,87.5 43.5,88.5 47,91.5 C47.5,101 47,112 45.5,122 C44.5,127.5 42,131 39.5,131 C36.5,127 34.5,118 34,108 C33.8,101 34.2,95 35,89 Z' },
  { m: 'adductors', mirror: true, d: 'M47.8,92.5 C48.8,93.5 49.5,94.5 49.6,96 L49.4,108 C48.6,112 47.5,115 46.2,117 C47,109 47.6,100 47.8,92.5 Z' },
  { m: 'calves', mirror: true, d: 'M37.5,139 C40,137.5 43.5,137.5 45.5,140 C46,149 45,159 43,169 L39.6,169.5 C37.5,160 36.5,149 37.5,139 Z' },
];

const BACK: Shape[] = [
  { m: 'traps', d: 'M50,24 C47,28 42,31 36.5,33 C40,36 44,40 46,45 L50,55 L54,45 C56,40 60,36 63.5,33 C58,31 53,28 50,24 Z' },
  { m: 'deltsRear', mirror: true, d: 'M35.5,32.5 C30,32.5 26,35.5 24.8,41.5 C24.5,43.5 24.6,45.5 25,47 L29,45 C29.5,40 32,36.5 37.5,34.5 Z' },
  { m: 'triceps', mirror: true, d: 'M25,48.5 L29.2,46 L33,48 C33.2,54 32,60 30,64 L24.3,63.5 C23.3,58.5 23.5,53 25,48.5 Z' },
  { m: 'forearms', mirror: true, d: 'M23.6,65.5 L29.5,66 C29.8,73 28.2,80 26.2,86.5 L21.4,86 C20.5,79 21.4,71.5 23.6,65.5 Z' },
  { m: 'lats', mirror: true, d: 'M38,36 C41.5,39 44.5,42.5 45.8,46 L49.4,57 L49.4,64 C45,65.5 40.5,63.5 37.5,60 C35,54 34.5,46 35.5,40 C36,38.5 37,37 38,36 Z' },
  { m: 'lowerBack', d: 'M43,64.5 C45.5,66.5 48,67 50,67 C52,67 54.5,66.5 57,64.5 L58,80 C55,82.5 45,82.5 42,80 Z' },
  { m: 'glutes', mirror: true, d: 'M36,83 C40,81 46,81.5 49.5,84 L49.5,100 C45.5,103 39.5,102.5 36,99 C34.5,94 34.6,88 36,83 Z' },
  { m: 'hamstrings', mirror: true, d: 'M35.8,103 C39.5,105 44.5,105 48,103.5 C48,112 47,121 45.5,128 C44,131.5 41,132.5 38.5,131 C35.5,123 34.5,113 35.8,103 Z' },
  { m: 'calves', mirror: true, d: 'M37,138.5 C40.5,135.5 45.5,136.5 46.5,141 C47,150 45.5,159 43.3,168 L39.3,168.5 C36.5,159 35.8,148 37,138.5 Z' },
];

const MIRROR = 'translate(100 0) scale(-1 1)';

function Silhouette() {
  // nicht anklickbare Teile: Kopf, Hals, Hände, Knie, Füße
  const parts = (
    <>
      <ellipse cx="23.6" cy="91.5" rx="3" ry="4.5" />
      <ellipse cx="41.5" cy="134.5" rx="4" ry="2.6" />
      <path d="M39,172 L44,172 L45.5,180 C45.5,181.5 37,181.5 37,180 Z" />
    </>
  );
  return (
    <g className={s.base}>
      <ellipse cx="50" cy="13" rx="8.5" ry="10.5" />
      <path d="M45.5,22 L54.5,22 L55,29 L45,29 Z" />
      {parts}
      <g transform={MIRROR}>{parts}</g>
    </g>
  );
}

interface FigureProps {
  shapes: Shape[];
  colors: Partial<Record<MuscleId, string>>;
  selected?: MuscleId;
  onSelect?: (m: MuscleId) => void;
}

function Figure({ shapes, colors, selected, onSelect }: FigureProps) {
  const path = (sh: Shape, mirrored: boolean) => (
    <path
      key={`${sh.m}-${mirrored ? 'r' : 'l'}-${sh.d.length}`}
      d={sh.d}
      data-muscle={sh.m}
      transform={mirrored ? MIRROR : undefined}
      fill={colors[sh.m] ?? 'var(--muscle-none)'}
      className={`${s.muscle} ${selected === sh.m ? s.selected : ''} ${onSelect ? s.clickable : ''}`}
      onClick={onSelect ? () => onSelect(sh.m) : undefined}
    >
      <title>{MUSCLE_LABEL[sh.m]}</title>
    </path>
  );
  return (
    <>
      <Silhouette />
      {shapes.map((sh) => path(sh, false))}
      {shapes.filter((sh) => sh.mirror).map((sh) => path(sh, true))}
    </>
  );
}

interface Props {
  colors: Partial<Record<MuscleId, string>>;
  selected?: MuscleId;
  onSelect?: (m: MuscleId) => void;
  small?: boolean;
  label: string;
}

/** Körperfigur von vorne und hinten. Jede Muskelgruppe ist ein eigener Pfad mit data-muscle. */
export function BodyMap({ colors, selected, onSelect, small, label }: Props) {
  return (
    <svg
      className={`${s.map} ${small ? s.small : ''}`}
      viewBox={small ? '16 0 158 184' : '14 0 162 198'}
      role="img"
      aria-label={label}
      data-testid="body-map"
    >
      <g>
        <Figure shapes={FRONT} colors={colors} selected={selected} onSelect={onSelect} />
      </g>
      <g transform="translate(90 0)">
        <Figure shapes={BACK} colors={colors} selected={selected} onSelect={onSelect} />
      </g>
      {!small && (
        <g className={s.caption}>
          <text x="50" y="194" textAnchor="middle">
            Vorne
          </text>
          <text x="140" y="194" textAnchor="middle">
            Hinten
          </text>
        </g>
      )}
    </svg>
  );
}
