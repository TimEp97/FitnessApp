export type ID = string;

export type MuscleId =
  | 'chest' | 'deltsFront' | 'deltsSide' | 'deltsRear' | 'biceps' | 'triceps'
  | 'forearms' | 'traps' | 'lats' | 'lowerBack' | 'abs' | 'obliques'
  | 'quads' | 'hamstrings' | 'glutes' | 'adductors' | 'calves';

export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'kettlebell' | 'bodyweight';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: ID;
  name: string;
  equipment: Equipment;
  level: Level;
  primary: MuscleId[];
  secondary: MuscleId[];
  steps: string[];
  breathing: string;
  mistakes: string[];
  safety?: string;
  recommended: { sets: [number, number]; reps: [number, number] };
  /** Schrittweite der Plus/Minus-Tasten in kg */
  weightStep: number;
  illustration?: string;
  custom: boolean;
}

export interface PlanItem {
  exerciseId: ID;
  sets: number;
  reps: [number, number];
}

export interface PlanDay {
  id: ID;
  name: string;
  items: PlanItem[];
}

export interface Plan {
  id: ID;
  name: string;
  days: PlanDay[];
  createdAt: string;
  /** Teil der Beispieldaten */
  sample?: boolean;
}

export interface SetLog {
  id: ID;
  kind: 'warmup' | 'work';
  weight: number;
  reps: number;
  doneAt: string;
}

export interface WorkoutEntry {
  exerciseId: ID;
  note?: string;
  /** Vorgabe aus dem Plan zum Startzeitpunkt */
  target?: { sets: number; reps: [number, number] };
  sets: SetLog[];
}

/** Bedienzustand des laufenden Workouts, damit es nach einem Neustart an derselben Stelle weitergeht. */
export interface WorkoutCursor {
  index: number;
  pausedAt?: string;
  restEndsAt?: string;
  restTotal?: number;
}

export interface Workout {
  id: ID;
  planId?: ID;
  planDayId?: ID;
  name: string;
  startedAt: string;
  /** fehlt = läuft noch */
  finishedAt?: string;
  pausedMs: number;
  note?: string;
  entries: WorkoutEntry[];
  cursor?: WorkoutCursor;
  sample?: boolean;
}

export interface BodyLog {
  id: ID;
  date: string;
  weight?: number;
  bodyFat?: number;
  measures?: Record<string, number>;
  sample?: boolean;
}

export type Goal = 'muscle' | 'strength' | 'fitness' | 'endurance';

export interface Settings {
  id: 'settings';
  name: string;
  goal: Goal;
  experience: Level;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
  activePlanId?: ID;
  restSeconds: number;
  theme: 'system' | 'dark' | 'light';
  hasSampleData: boolean;
  onboardingDone: boolean;
}
