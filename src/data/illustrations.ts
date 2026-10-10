import type { Exercise, MuscleId } from '../types';

/**
 * Piktogramme der Übungen, Seitenansicht (oder Frontansicht), Blickrichtung rechts.
 * Koordinaten im Raster 160 × 120, Boden bei y = 113.
 */

type P = [number, number];

export interface Limb {
  p: P[];
  /** Strichstärke, Standard 7 */
  w?: number;
  /** hinterer Arm oder hinteres Bein, blasser dargestellt */
  far?: boolean;
}

export type Prop =
  | { k: 'plate'; at: P; r?: number }
  | { k: 'db'; at: P }
  | { k: 'dbFront'; at: P }
  | { k: 'kb'; at: P }
  | { k: 'pad'; at: P; r?: number }
  | { k: 'line'; p: P[]; w?: number; eq?: boolean }
  | { k: 'rect'; x: number; y: number; w: number; h: number; eq?: boolean };

export interface Pose {
  head: P;
  limbs: Limb[];
  props: Prop[];
  /** Geräte, die vor dem Körper liegen (z. B. Hantel in der Hand) */
  front?: Prop[];
  noFloor?: boolean;
}

type Tool = 'plate' | 'db';
const tool = (t: Tool, at: P, r = 10): Prop => (t === 'plate' ? { k: 'plate', at, r } : { k: 'db', at });

const bench = (x0: number, x1: number, y: number): Prop[] => [
  { k: 'rect', x: x0, y, w: x1 - x0, h: 6 },
  { k: 'line', p: [[x0 + 8, y + 6], [x0 + 8, 113]], w: 4 },
  { k: 'line', p: [[x1 - 8, y + 6], [x1 - 8, 113]], w: 4 },
];

const column = (x: number): Prop[] => [
  { k: 'line', p: [[x, 6], [x, 113]], w: 6 },
  { k: 'line', p: [[x - 8, 113], [x + 8, 113]], w: 6 },
];

// Stehende Grundfigur
const stand = { head: [80, 26] as P, sh: [80, 39] as P, hip: [80, 70] as P };
const standLegs: Limb[] = [
  { p: [stand.hip, [82, 91], [80, 112], [88, 112]], far: true },
  { p: [stand.hip, [80, 91], [78, 112], [86, 112]] },
];

const POSES = {
  bench: (t: Tool): Pose => ({
    head: [44, 71],
    limbs: [
      { p: [[56, 76], [98, 77]], w: 9 },
      { p: [[98, 77], [121, 70], [126, 112]] },
      { p: [[57, 76], [56, 57], [58, 40]], w: 6 },
    ],
    props: bench(40, 126, 82),
    front: [tool(t, [58, 37], 11)],
  }),
  incline: (t: Tool): Pose => ({
    head: [51, 45],
    limbs: [
      { p: [[60, 54], [98, 77]], w: 9 },
      { p: [[98, 77], [121, 72], [126, 112]] },
      { p: [[61, 54], [68, 36], [70, 19]], w: 6 },
    ],
    props: [{ k: 'line', p: [[48, 60], [96, 87]], w: 7 }, ...bench(92, 128, 84)],
    front: [tool(t, [70, 16], 10)],
  }),
  skull: (): Pose => ({
    head: [44, 71],
    limbs: [
      { p: [[56, 76], [98, 77]], w: 9 },
      { p: [[98, 77], [121, 70], [126, 112]] },
      { p: [[57, 76], [60, 48], [44, 52]], w: 6 },
    ],
    props: bench(40, 126, 82),
    front: [{ k: 'plate', at: [42, 50], r: 8 }],
  }),
  ohp: (t: Tool): Pose => ({
    head: stand.head,
    limbs: [
      { p: [stand.sh, stand.hip], w: 9 },
      ...standLegs,
      { p: [stand.sh, [90, 25], [86, 11]], w: 6 },
    ],
    props: [],
    front: [tool(t, [86, 10], 9)],
  }),
  ohTriceps: (): Pose => ({
    head: stand.head,
    limbs: [{ p: [stand.sh, stand.hip], w: 9 }, ...standLegs, { p: [stand.sh, [90, 16], [72, 22]], w: 6 }],
    props: [],
    front: [{ k: 'db', at: [70, 23] }],
  }),
  row: (t: Tool): Pose => ({
    head: [117, 43],
    limbs: [
      { p: [[106, 49], [70, 64]], w: 9 },
      { p: [[70, 64], [84, 88], [76, 112], [84, 112]] },
      { p: [[105, 50], [90, 63], [98, 76]], w: 6 },
    ],
    props: [],
    front: [tool(t, [98, 79], 10)],
  }),
  cableRow: (): Pose => ({
    head: [60, 46],
    limbs: [
      { p: [[60, 58], [58, 92]], w: 9 },
      { p: [[58, 92], [86, 80], [110, 96]] },
      { p: [[61, 60], [46, 74], [72, 76]], w: 6 },
    ],
    props: [
      { k: 'rect', x: 40, y: 98, w: 40, h: 6 },
      { k: 'line', p: [[60, 104], [60, 113]], w: 5 },
      { k: 'line', p: [[114, 82], [114, 108]], w: 5 },
      ...column(132),
      { k: 'line', p: [[74, 76], [132, 82]], w: 2, eq: true },
    ],
    front: [{ k: 'pad', at: [74, 76], r: 4 }],
  }),
  pulldown: (): Pose => ({
    head: [82, 34],
    limbs: [
      { p: [[80, 46], [76, 76]], w: 9 },
      { p: [[76, 76], [102, 76], [104, 108], [112, 108]] },
      { p: [[81, 47], [96, 32], [92, 14]], w: 6 },
    ],
    props: [
      { k: 'rect', x: 60, y: 80, w: 34, h: 6 },
      { k: 'line', p: [[76, 86], [76, 113]], w: 5 },
      ...column(128),
      { k: 'line', p: [[92, 12], [92, 6], [128, 6]], w: 2, eq: true },
    ],
    front: [{ k: 'line', p: [[72, 13], [112, 13]], w: 4, eq: true }],
  }),
  pullup: (): Pose => ({
    head: [80, 28],
    limbs: [
      { p: [[80, 40], [80, 72]], w: 9 },
      { p: [[80, 72], [86, 92], [72, 104]] },
      { p: [[81, 41], [94, 30], [86, 12]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[40, 11], [120, 11]], w: 5 },
      { k: 'line', p: [[44, 11], [44, 113]], w: 4 },
      { k: 'line', p: [[116, 11], [116, 113]], w: 4 },
    ],
  }),
  squat: (t: 'plate' | 'none' | 'kb'): Pose => ({
    head: [101, 41],
    limbs: [
      { p: [[92, 53], [74, 84]], w: 9 },
      { p: [[74, 84], [106, 90], [92, 112], [101, 112]] },
      t === 'none'
        ? { p: [[93, 54], [112, 58], [130, 58]], w: 6 }
        : t === 'kb'
          ? { p: [[93, 54], [100, 70], [106, 60]], w: 6 }
          : { p: [[92, 54], [80, 62], [88, 48]], w: 6 },
    ],
    props: [],
    front: t === 'plate' ? [{ k: 'plate', at: [89, 50], r: 10 }] : t === 'kb' ? [{ k: 'kb', at: [109, 60] }] : [],
  }),
  deadlift: (): Pose => ({
    head: [114, 49],
    limbs: [
      { p: [[104, 57], [70, 72]], w: 9 },
      { p: [[70, 72], [96, 89], [84, 112], [93, 112]] },
      { p: [[103, 58], [102, 79], [101, 98]], w: 6 },
    ],
    props: [],
    front: [{ k: 'plate', at: [101, 101], r: 12 }],
  }),
  rdl: (): Pose => ({
    head: [118, 53],
    limbs: [
      { p: [[106, 58], [70, 62]], w: 9 },
      { p: [[70, 62], [80, 88], [76, 112], [85, 112]] },
      { p: [[105, 59], [104, 76], [102, 92]], w: 6 },
    ],
    props: [],
    front: [{ k: 'plate', at: [102, 94], r: 10 }],
  }),
  lunge: (): Pose => ({
    head: [84, 34],
    limbs: [
      { p: [[84, 46], [84, 78]], w: 9 },
      { p: [[84, 78], [62, 96], [46, 108], [40, 112]], far: true },
      { p: [[84, 78], [108, 86], [108, 112], [117, 112]] },
      { p: [[85, 47], [86, 64], [86, 80]], w: 6 },
    ],
    props: [],
    front: [{ k: 'db', at: [86, 83] }],
  }),
  split: (): Pose => ({
    head: [84, 34],
    limbs: [
      { p: [[84, 46], [84, 78]], w: 9 },
      { p: [[84, 78], [62, 98], [46, 84]], far: true },
      { p: [[84, 78], [108, 88], [104, 112], [113, 112]] },
      { p: [[85, 47], [86, 64], [86, 80]], w: 6 },
    ],
    props: bench(26, 56, 84),
    front: [{ k: 'db', at: [86, 83] }],
  }),
  curl: (t: Tool): Pose => ({
    head: stand.head,
    limbs: [
      { p: [stand.sh, [79, 58], [79, 77]], w: 6, far: true },
      { p: [stand.sh, stand.hip], w: 9 },
      ...standLegs,
      { p: [stand.sh, [83, 60], [99, 46]], w: 6 },
    ],
    props: [],
    front: [tool(t, [100, 44], 7)],
  }),
  pushdown: (): Pose => ({
    head: stand.head,
    limbs: [{ p: [stand.sh, stand.hip], w: 9 }, ...standLegs, { p: [stand.sh, [83, 60], [92, 76]], w: 6 }],
    props: [...column(124), { k: 'line', p: [[124, 10], [93, 76]], w: 2, eq: true }],
    front: [{ k: 'pad', at: [93, 77], r: 4 }],
  }),
  frontRaise: (): Pose => ({
    head: stand.head,
    limbs: [{ p: [stand.sh, stand.hip], w: 9 }, ...standLegs, { p: [stand.sh, [99, 40], [118, 41]], w: 6 }],
    props: [],
    front: [{ k: 'db', at: [120, 41] }],
  }),
  swing: (): Pose => ({
    head: [86, 28],
    limbs: [
      { p: [[84, 40], [78, 70]], w: 9 },
      { p: [[78, 70], [84, 91], [80, 112], [89, 112]] },
      { p: [[85, 42], [104, 46], [122, 50]], w: 6 },
    ],
    props: [],
    front: [{ k: 'kb', at: [127, 52] }],
  }),
  facepull: (): Pose => ({
    head: [84, 26],
    limbs: [
      { p: [[84, 39], [84, 70]], w: 9 },
      { p: [[84, 70], [84, 91], [86, 112], [78, 112]] },
      { p: [[84, 40], [100, 34], [74, 28]], w: 6 },
    ],
    props: [...column(30), { k: 'line', p: [[30, 26], [72, 28]], w: 2, eq: true }],
    front: [{ k: 'pad', at: [72, 28], r: 4 }],
  }),
  calf: (withDb: boolean): Pose => ({
    head: [80, 20],
    limbs: [
      { p: [[80, 33], [80, 64]], w: 9 },
      { p: [[80, 64], [81, 84], [80, 101], [92, 104]] },
      { p: [[80, 34], [80, 52], [80, 68]], w: 6 },
    ],
    props: [{ k: 'rect', x: 74, y: 104, w: 34, h: 9 }],
    front: withDb ? [{ k: 'db', at: [80, 71] }] : [],
  }),
  calfSeated: (): Pose => ({
    head: [62, 32],
    limbs: [
      { p: [[62, 44], [64, 76]], w: 9 },
      { p: [[64, 76], [94, 76], [96, 98], [106, 96]] },
      { p: [[63, 46], [74, 62], [90, 70]], w: 6 },
    ],
    props: [
      { k: 'rect', x: 50, y: 80, w: 34, h: 6 },
      { k: 'line', p: [[66, 86], [66, 113]], w: 5 },
      { k: 'rect', x: 92, y: 100, w: 22, h: 13 },
    ],
    front: [{ k: 'rect', x: 84, y: 64, w: 20, h: 7, eq: true }],
  }),
  crunch: (): Pose => ({
    head: [58, 82],
    limbs: [
      { p: [[68, 90], [90, 104]], w: 9 },
      { p: [[90, 104], [110, 84], [124, 108], [130, 108]] },
      { p: [[68, 89], [62, 72], [56, 78]], w: 6 },
    ],
    props: [{ k: 'rect', x: 36, y: 108, w: 100, h: 5 }],
  }),
  cableCrunch: (): Pose => ({
    head: [104, 90],
    limbs: [
      { p: [[96, 80], [72, 86]], w: 9 },
      { p: [[72, 86], [70, 110], [48, 110]] },
      { p: [[96, 80], [102, 92], [106, 84]], w: 6 },
    ],
    props: [...column(130), { k: 'line', p: [[130, 10], [106, 83]], w: 2, eq: true }],
    front: [{ k: 'pad', at: [106, 83], r: 4 }],
  }),
  hangingLegRaise: (): Pose => ({
    head: [76, 30],
    limbs: [
      { p: [[82, 40], [82, 72]], w: 9 },
      { p: [[82, 72], [104, 70], [126, 66]] },
      { p: [[82, 40], [83, 26], [84, 12]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[40, 11], [130, 11]], w: 5 },
      { k: 'line', p: [[44, 11], [44, 113]], w: 4 },
      { k: 'line', p: [[126, 11], [126, 40]], w: 4 },
    ],
  }),
  rollout: (): Pose => ({
    head: [120, 75],
    limbs: [
      { p: [[110, 81], [78, 92]], w: 9 },
      { p: [[78, 92], [58, 108], [38, 108]] },
      { p: [[110, 82], [122, 94], [130, 102]], w: 6 },
    ],
    props: [],
    front: [{ k: 'pad', at: [132, 104], r: 9 }],
  }),
  twist: (): Pose => ({
    head: [60, 62],
    limbs: [
      { p: [[67, 72], [82, 104]], w: 9 },
      { p: [[82, 104], [102, 86], [120, 98]] },
      { p: [[67, 73], [86, 76], [98, 84]], w: 6 },
    ],
    props: [],
    front: [{ k: 'kb', at: [102, 86] }],
  }),
  pushup: (): Pose => ({
    head: [119, 74],
    limbs: [
      { p: [[107, 80], [66, 92]], w: 9 },
      { p: [[66, 92], [46, 101], [28, 110]] },
      { p: [[107, 81], [108, 96], [108, 112]], w: 6 },
    ],
    props: [],
  }),
  dips: (): Pose => ({
    head: [80, 20],
    limbs: [
      { p: [[80, 32], [80, 64]], w: 9 },
      { p: [[80, 64], [80, 86], [66, 98]] },
      { p: [[81, 33], [88, 46], [84, 58]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[60, 59], [118, 59]], w: 5 },
      { k: 'line', p: [[64, 59], [64, 113]], w: 4 },
      { k: 'line', p: [[114, 59], [114, 113]], w: 4 },
    ],
  }),
  legpress: (): Pose => ({
    head: [40, 70],
    limbs: [
      { p: [[49, 77], [72, 98]], w: 9 },
      { p: [[72, 98], [92, 72], [112, 78]] },
      { p: [[50, 78], [62, 90], [72, 96]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[34, 82], [64, 108]], w: 7 },
      { k: 'line', p: [[64, 108], [96, 108]], w: 7 },
      { k: 'line', p: [[96, 113], [148, 30]], w: 4 },
    ],
    front: [{ k: 'line', p: [[112, 62], [122, 96]], w: 7, eq: true }],
  }),
  legext: (): Pose => ({
    head: [64, 30],
    limbs: [
      { p: [[64, 42], [66, 74]], w: 9 },
      { p: [[66, 74], [94, 76], [120, 66]] },
      { p: [[65, 44], [70, 60], [80, 74]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[54, 36], [56, 80]], w: 6 },
      { k: 'rect', x: 52, y: 80, w: 44, h: 6 },
      { k: 'line', p: [[72, 86], [72, 113]], w: 5 },
    ],
    front: [{ k: 'pad', at: [120, 72], r: 5 }],
  }),
  legcurl: (): Pose => ({
    head: [40, 68],
    limbs: [
      { p: [[52, 72], [90, 72]], w: 9 },
      { p: [[90, 72], [114, 72], [116, 46]] },
      { p: [[52, 73], [46, 84], [40, 86]], w: 6 },
    ],
    props: bench(36, 122, 78),
    front: [{ k: 'pad', at: [120, 50], r: 5 }],
  }),
  hipthrust: (): Pose => ({
    head: [42, 62],
    limbs: [
      { p: [[52, 70], [88, 72]], w: 9 },
      { p: [[88, 72], [108, 74], [110, 110], [118, 110]] },
      { p: [[53, 71], [70, 70], [86, 66]], w: 6 },
    ],
    props: [{ k: 'rect', x: 30, y: 74, w: 22, h: 39 }],
    front: [{ k: 'plate', at: [88, 63], r: 9 }],
  }),
  backExt: (): Pose => ({
    head: [40, 64],
    limbs: [
      { p: [[52, 69], [88, 80]], w: 9 },
      { p: [[88, 80], [108, 92], [128, 104]] },
      { p: [[53, 70], [62, 80], [70, 72]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[78, 90], [104, 104]], w: 7 },
      { k: 'line', p: [[90, 98], [80, 113]], w: 4 },
      { k: 'line', p: [[124, 112], [134, 104]], w: 5 },
    ],
  }),
  // Frontansichten
  raise: (): Pose => ({
    head: [80, 25],
    limbs: [
      { p: [[80, 37], [80, 68]], w: 10 },
      { p: [[66, 40], [94, 40]], w: 8 },
      { p: [[75, 68], [72, 90], [70, 112]] },
      { p: [[85, 68], [88, 90], [90, 112]] },
      { p: [[66, 40], [49, 42], [33, 43]], w: 6 },
      { p: [[94, 40], [111, 42], [127, 43]], w: 6 },
    ],
    props: [],
    front: [{ k: 'dbFront', at: [30, 43] }, { k: 'dbFront', at: [130, 43] }],
  }),
  fly: (): Pose => ({
    head: [80, 30],
    limbs: [
      { p: [[80, 42], [80, 72]], w: 10 },
      { p: [[66, 45], [94, 45]], w: 8 },
      { p: [[75, 72], [70, 92], [64, 112]] },
      { p: [[85, 72], [90, 92], [96, 112]] },
      { p: [[66, 45], [54, 54], [70, 64]], w: 6 },
      { p: [[94, 45], [106, 54], [90, 64]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[14, 6], [14, 113]], w: 6 },
      { k: 'line', p: [[146, 6], [146, 113]], w: 6 },
      { k: 'line', p: [[14, 10], [70, 64]], w: 2, eq: true },
      { k: 'line', p: [[146, 10], [90, 64]], w: 2, eq: true },
    ],
    front: [{ k: 'pad', at: [72, 64], r: 4 }, { k: 'pad', at: [88, 64], r: 4 }],
  }),
  shrug: (): Pose => ({
    head: [80, 27],
    limbs: [
      { p: [[80, 37], [80, 70]], w: 10 },
      { p: [[65, 37], [95, 37]], w: 8 },
      { p: [[75, 70], [73, 91], [72, 112]] },
      { p: [[85, 70], [87, 91], [88, 112]] },
      { p: [[65, 37], [63, 57], [62, 76]], w: 6 },
      { p: [[95, 37], [97, 57], [98, 76]], w: 6 },
    ],
    props: [],
    front: [{ k: 'dbFront', at: [62, 79] }, { k: 'dbFront', at: [98, 79] }],
  }),
  sidebend: (): Pose => ({
    head: [92, 27],
    limbs: [
      { p: [[89, 38], [80, 70]], w: 10 },
      { p: [[75, 36], [103, 41]], w: 8 },
      { p: [[75, 70], [72, 91], [70, 112]] },
      { p: [[85, 70], [88, 91], [90, 112]] },
      { p: [[75, 36], [66, 55], [60, 74]], w: 6 },
      { p: [[103, 41], [104, 56], [90, 62]], w: 6 },
    ],
    props: [],
    front: [{ k: 'dbFront', at: [59, 77] }],
  }),
  adductor: (): Pose => ({
    head: [80, 22],
    limbs: [
      { p: [[80, 34], [80, 66]], w: 10 },
      { p: [[66, 37], [94, 37]], w: 8 },
      { p: [[76, 68], [56, 80], [58, 106]] },
      { p: [[84, 68], [104, 80], [102, 106]] },
      { p: [[66, 37], [62, 54], [66, 68]], w: 6 },
      { p: [[94, 37], [98, 54], [94, 68]], w: 6 },
    ],
    props: [{ k: 'rect', x: 58, y: 70, w: 44, h: 6 }, { k: 'line', p: [[80, 76], [80, 113]], w: 5 }],
    front: [{ k: 'pad', at: [62, 82], r: 5 }, { k: 'pad', at: [98, 82], r: 5 }],
  }),
  machinePress: (up: boolean): Pose => ({
    head: [60, 32],
    limbs: [
      { p: [[60, 44], [62, 80]], w: 9 },
      { p: [[62, 80], [88, 82], [90, 110], [98, 110]] },
      up ? { p: [[61, 46], [70, 32], [68, 16]], w: 6 } : { p: [[61, 47], [80, 54], [100, 48]], w: 6 },
    ],
    props: [
      { k: 'line', p: [[50, 34], [52, 84]], w: 6 },
      { k: 'rect', x: 48, y: 84, w: 40, h: 6 },
      { k: 'line', p: [[64, 90], [64, 113]], w: 5 },
      ...column(126),
    ],
    front: [up ? { k: 'line', p: [[68, 14], [126, 14]], w: 4, eq: true } : { k: 'line', p: [[100, 48], [126, 48]], w: 4, eq: true }],
  }),
} satisfies Record<string, (...args: never[]) => Pose>;

const BY_EXERCISE: Record<string, () => Pose> = {
  'bench-press': () => POSES.bench('plate'),
  'incline-bench-press': () => POSES.incline('plate'),
  'db-bench-press': () => POSES.bench('db'),
  'incline-db-press': () => POSES.incline('db'),
  'cable-fly': POSES.fly,
  'pec-deck': () => POSES.machinePress(false),
  'push-up': POSES.pushup,
  dips: POSES.dips,
  'pull-up': POSES.pullup,
  'lat-pulldown': POSES.pulldown,
  'barbell-row': () => POSES.row('plate'),
  'db-row': () => POSES.row('db'),
  'seated-cable-row': POSES.cableRow,
  deadlift: POSES.deadlift,
  'chest-supported-row': () => POSES.row('db'),
  'face-pull': POSES.facepull,
  'db-shrug': POSES.shrug,
  'back-extension': POSES.backExt,
  'kb-swing': POSES.swing,
  'overhead-press': () => POSES.ohp('plate'),
  'db-shoulder-press': () => POSES.ohp('db'),
  'lateral-raise': POSES.raise,
  'cable-lateral-raise': POSES.raise,
  'reverse-fly': () => POSES.row('db'),
  'machine-shoulder-press': () => POSES.machinePress(true),
  'front-raise': POSES.frontRaise,
  'barbell-curl': () => POSES.curl('plate'),
  'db-curl': () => POSES.curl('db'),
  'hammer-curl': () => POSES.curl('db'),
  'cable-curl': () => POSES.curl('db'),
  'triceps-pushdown': POSES.pushdown,
  'skull-crusher': POSES.skull,
  'overhead-triceps': POSES.ohTriceps,
  'close-grip-bench': () => POSES.bench('plate'),
  'wrist-curl': () => POSES.curl('db'),
  'reverse-curl': () => POSES.curl('plate'),
  squat: () => POSES.squat('plate'),
  'front-squat': () => POSES.squat('plate'),
  'leg-press': POSES.legpress,
  'romanian-deadlift': POSES.rdl,
  'db-lunge': POSES.lunge,
  'bulgarian-split-squat': POSES.split,
  'leg-extension': POSES.legext,
  'leg-curl': POSES.legcurl,
  'hip-thrust': POSES.hipthrust,
  'adductor-machine': POSES.adductor,
  'standing-calf-raise': () => POSES.calf(true),
  'seated-calf-raise': POSES.calfSeated,
  'bodyweight-calf-raise': () => POSES.calf(false),
  'goblet-squat': () => POSES.squat('kb'),
  'bodyweight-squat': () => POSES.squat('none'),
  crunch: POSES.crunch,
  'hanging-leg-raise': POSES.hangingLegRaise,
  'cable-crunch': POSES.cableCrunch,
  'russian-twist': POSES.twist,
  'db-side-bend': POSES.sidebend,
  'ab-wheel': POSES.rollout,
};

/** Für eigene Übungen: Piktogramm nach dem Hauptmuskel. */
const BY_MUSCLE: Record<MuscleId, () => Pose> = {
  chest: () => POSES.bench('db'),
  deltsFront: () => POSES.ohp('db'),
  deltsSide: POSES.raise,
  deltsRear: POSES.facepull,
  biceps: () => POSES.curl('db'),
  triceps: POSES.pushdown,
  forearms: () => POSES.curl('db'),
  traps: POSES.shrug,
  lats: POSES.pulldown,
  lowerBack: POSES.backExt,
  abs: POSES.crunch,
  obliques: POSES.twist,
  quads: () => POSES.squat('none'),
  hamstrings: POSES.rdl,
  glutes: POSES.hipthrust,
  adductors: POSES.adductor,
  calves: () => POSES.calf(false),
};

export function poseFor(ex: Pick<Exercise, 'id' | 'primary'>): Pose {
  return (BY_EXERCISE[ex.id] ?? BY_MUSCLE[ex.primary[0]] ?? POSES.raise)();
}

export const hasBuiltinPose = (id: string) => id in BY_EXERCISE;
