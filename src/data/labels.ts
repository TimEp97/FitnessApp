import type { Equipment, Goal, Level, MuscleId } from '../types';

export const MUSCLES: MuscleId[] = [
  'chest', 'deltsFront', 'deltsSide', 'deltsRear', 'biceps', 'triceps',
  'forearms', 'traps', 'lats', 'lowerBack', 'abs', 'obliques',
  'quads', 'hamstrings', 'glutes', 'adductors', 'calves',
];

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: 'Brust',
  deltsFront: 'Vordere Schulter',
  deltsSide: 'Seitliche Schulter',
  deltsRear: 'Hintere Schulter',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  traps: 'Trapez',
  lats: 'Latissimus',
  lowerBack: 'Unterer Rücken',
  abs: 'Bauch',
  obliques: 'Seitliche Bauchmuskeln',
  quads: 'Quadrizeps',
  hamstrings: 'Beinbeuger',
  glutes: 'Gesäß',
  adductors: 'Adduktoren',
  calves: 'Waden',
};

export const MUSCLE_GROUPS: { id: string; label: string; muscles: MuscleId[] }[] = [
  { id: 'chest', label: 'Brust', muscles: ['chest'] },
  { id: 'back', label: 'Rücken', muscles: ['lats', 'traps', 'lowerBack'] },
  { id: 'shoulders', label: 'Schultern', muscles: ['deltsFront', 'deltsSide', 'deltsRear'] },
  { id: 'arms', label: 'Arme', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'legs', label: 'Beine', muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'] },
  { id: 'core', label: 'Bauch', muscles: ['abs', 'obliques'] },
];

/** Kurzer Gruppenname für Übersichten („Brust, Schultern, Trizeps“). */
export const MUSCLE_SHORT: Record<MuscleId, string> = {
  chest: 'Brust',
  deltsFront: 'Schultern',
  deltsSide: 'Schultern',
  deltsRear: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  traps: 'Rücken',
  lats: 'Rücken',
  lowerBack: 'Rücken',
  abs: 'Bauch',
  obliques: 'Bauch',
  quads: 'Beine',
  hamstrings: 'Beine',
  glutes: 'Gesäß',
  adductors: 'Beine',
  calves: 'Waden',
};

export const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'bodyweight'];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  cable: 'Kabelzug',
  machine: 'Maschine',
  kettlebell: 'Kettlebell',
  bodyweight: 'Körpergewicht',
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Einsteiger',
  intermediate: 'Fortgeschritten',
  advanced: 'Erfahren',
};

export const GOAL_LABEL: Record<Goal, string> = {
  muscle: 'Muskelaufbau',
  strength: 'Kraft',
  fitness: 'Fitness',
  endurance: 'Ausdauer',
};

export const GOAL_HINT: Record<Goal, string> = {
  muscle: 'Mehr Muskelmasse, 8 bis 12 Wiederholungen',
  strength: 'Schwerere Gewichte, 4 bis 6 Wiederholungen',
  fitness: 'Allgemein fit und belastbar',
  endurance: 'Kraftausdauer, 15 und mehr Wiederholungen',
};
