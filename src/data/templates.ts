export interface TemplateDay {
  name: string;
  items: [exerciseId: string, sets: number, repsLow: number, repsHigh: number][];
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  days: TemplateDay[];
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Beine',
    description: '3 Tage · Drücken, Ziehen, Beine',
    days: [
      {
        name: 'Push-Tag',
        items: [
          ['bench-press', 4, 6, 10],
          ['incline-db-press', 3, 8, 12],
          ['db-shoulder-press', 3, 8, 12],
          ['lateral-raise', 3, 12, 20],
          ['triceps-pushdown', 3, 10, 15],
        ],
      },
      {
        name: 'Pull-Tag',
        items: [
          ['pull-up', 3, 5, 10],
          ['barbell-row', 3, 6, 10],
          ['lat-pulldown', 3, 8, 12],
          ['face-pull', 3, 12, 20],
          ['db-curl', 3, 8, 12],
        ],
      },
      {
        name: 'Beine-Tag',
        items: [
          ['squat', 4, 5, 8],
          ['romanian-deadlift', 3, 6, 10],
          ['leg-press', 3, 8, 15],
          ['leg-curl', 3, 10, 15],
          ['crunch', 3, 12, 25],
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Oberkörper / Unterkörper',
    description: '2 Tage im Wechsel',
    days: [
      {
        name: 'Oberkörper',
        items: [
          ['bench-press', 4, 6, 10],
          ['barbell-row', 4, 6, 10],
          ['db-shoulder-press', 3, 8, 12],
          ['lat-pulldown', 3, 8, 12],
          ['db-curl', 2, 8, 12],
          ['triceps-pushdown', 2, 10, 15],
        ],
      },
      {
        name: 'Unterkörper',
        items: [
          ['squat', 4, 5, 8],
          ['romanian-deadlift', 3, 6, 10],
          ['db-lunge', 3, 8, 12],
          ['leg-curl', 3, 10, 15],
          ['standing-calf-raise', 3, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Ganzkörper',
    description: '2 Tage im Wechsel · ideal für den Einstieg',
    days: [
      {
        name: 'Ganzkörper A',
        items: [
          ['squat', 3, 5, 8],
          ['bench-press', 3, 6, 10],
          ['seated-cable-row', 3, 8, 12],
          ['lateral-raise', 2, 12, 20],
          ['crunch', 2, 12, 25],
        ],
      },
      {
        name: 'Ganzkörper B',
        items: [
          ['deadlift', 3, 3, 6],
          ['overhead-press', 3, 5, 8],
          ['lat-pulldown', 3, 8, 12],
          ['db-lunge', 2, 8, 12],
          ['hammer-curl', 2, 8, 12],
        ],
      },
    ],
  },
  {
    id: 'four-day-split',
    name: 'Vier-Tage-Split',
    description: '4 Tage · Brust, Rücken, Beine, Schultern',
    days: [
      {
        name: 'Brust & Trizeps',
        items: [
          ['bench-press', 4, 6, 10],
          ['incline-db-press', 3, 8, 12],
          ['cable-fly', 3, 10, 15],
          ['skull-crusher', 3, 8, 12],
          ['triceps-pushdown', 3, 10, 15],
        ],
      },
      {
        name: 'Rücken & Bizeps',
        items: [
          ['deadlift', 3, 3, 6],
          ['pull-up', 3, 5, 10],
          ['seated-cable-row', 3, 8, 12],
          ['barbell-curl', 3, 8, 12],
          ['hammer-curl', 2, 8, 12],
        ],
      },
      {
        name: 'Beine',
        items: [
          ['squat', 4, 5, 8],
          ['leg-press', 3, 8, 15],
          ['leg-curl', 3, 10, 15],
          ['hip-thrust', 3, 8, 12],
          ['standing-calf-raise', 4, 10, 15],
        ],
      },
      {
        name: 'Schultern & Bauch',
        items: [
          ['overhead-press', 4, 5, 8],
          ['lateral-raise', 4, 12, 20],
          ['reverse-fly', 3, 12, 20],
          ['db-shrug', 3, 10, 15],
          ['hanging-leg-raise', 3, 8, 15],
        ],
      },
    ],
  },
];
