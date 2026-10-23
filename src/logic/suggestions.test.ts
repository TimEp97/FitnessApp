import { describe, expect, it } from 'vitest';
import type { Plan } from '../types';
import { suggestExercises, suggestWeight } from './suggestions';
import type { Session } from './metrics';
import { exercise, set, workout } from '../test/factory';

const session = (...sets: [number, number][]): Session => ({ workoutId: 'w', date: '2026-03-01', sets: sets.map(([w, r]) => set(w, r)) });

describe('Gewichtsvorschlag', () => {
  it('ohne Historie gibt es keinen Vorschlag', () => {
    const s = suggestWeight([], [8, 12], 2.5);
    expect(s.kind).toBe('none');
    expect(s.text).toMatch(/zuerst einen Satz/);
  });

  it('alle Sätze am oberen Ende: Gewicht + Schrittweite, Wiederholungen unten', () => {
    const s = suggestWeight([session([80, 12], [80, 12], [80, 13])], [8, 12], 2.5);
    expect(s).toMatchObject({ kind: 'increase', weight: 82.5, reps: 8 });
    expect(s.text).toMatch(/^Vorschlag/);
  });

  it('sonst gleiches Gewicht und eine Wiederholung mehr als der beste Satz', () => {
    const s = suggestWeight([session([80, 10], [80, 9], [80, 8])], [8, 12], 2.5);
    expect(s).toMatchObject({ kind: 'repeat', weight: 80, reps: 11 });
  });

  it('unteres Ende zweimal in Folge verfehlt: Gewicht senken', () => {
    const s = suggestWeight([session([80, 7], [80, 6]), session([80, 7], [80, 5])], [8, 12], 2.5);
    expect(s).toMatchObject({ kind: 'decrease', weight: 77.5, reps: 8 });
  });

  it('einmal verfehlt senkt noch nicht', () => {
    const s = suggestWeight([session([80, 9]), session([80, 7])], [8, 12], 2.5);
    expect(s).toMatchObject({ kind: 'repeat', weight: 80, reps: 8 });
  });
});

describe('Übungsvorschläge', () => {
  const now = new Date('2026-03-20T12:00:00');
  const exercises = [
    exercise('bench', ['chest'], ['triceps']),
    exercise('calf-machine', ['calves'], [], { equipment: 'machine' }),
    exercise('calf-bw', ['calves'], [], { equipment: 'bodyweight' }),
    exercise('curl', ['biceps'], [], { equipment: 'dumbbell' }),
    exercise('row', ['lats'], ['biceps']),
  ];
  const plan: Plan = { id: 'p', name: 'P', createdAt: '', days: [{ id: 'd', name: 'D', items: [{ exerciseId: 'bench', sets: 3, reps: [8, 12] }] }] };

  it('höchstens drei Vorschläge mit Begründung, nur passendes Equipment, nicht im Plan', () => {
    const list = suggestExercises({ workouts: [], exercises, plan, equipment: ['bodyweight', 'dumbbell', 'barbell'], experience: 'beginner', now });
    expect(list.length).toBeLessThanOrEqual(3);
    const ids = list.map((s) => s.exercise.id);
    expect(ids).not.toContain('bench');
    expect(ids).not.toContain('calf-machine');
    expect(list.every((s) => s.reason.length > 0)).toBe(true);
  });

  it('sortiert nach längster Pause', () => {
    const ws = [
      workout('2026-03-12T18:00:00', [{ ex: 'curl', sets: [set(10, 10)] }]),
      workout('2026-03-01T18:00:00', [{ ex: 'row', sets: [set(50, 10)] }]),
    ];
    const list = suggestExercises({ workouts: ws, exercises, plan, equipment: ['bodyweight', 'dumbbell', 'barbell'], experience: 'beginner', now, max: 10 });
    const muscles = list.map((s) => s.muscle);
    // nie trainiert (Waden) vor 19 Tagen Pause (Latissimus) vor 8 Tagen Pause (Bizeps)
    expect(muscles.indexOf('calves')).toBeLessThan(muscles.indexOf('lats'));
    expect(muscles.indexOf('lats')).toBeLessThan(muscles.indexOf('biceps'));
    expect(list.find((s) => s.muscle === 'biceps')?.reason).toBe('Bizeps: seit 8 Tagen nicht trainiert');
  });

  it('gut trainierte Muskeln werden nicht vorgeschlagen', () => {
    const ws = [0, 4, 8, 12, 16].map((d) =>
      workout(new Date(now.getTime() - d * 86400000).toISOString(), [{ ex: 'curl', sets: Array.from({ length: 6 }, () => set(10, 10)) }]),
    );
    const list = suggestExercises({ workouts: ws, exercises, plan, equipment: [], experience: 'beginner', now, max: 10 });
    expect(list.map((s) => s.muscle)).not.toContain('biceps');
  });
});
