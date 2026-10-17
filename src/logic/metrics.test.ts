import { describe, expect, it } from 'vitest';
import { analyzeRecords, epley1RM, workoutProgress, exerciseHistory, latestRecord, recordsInWorkout, streakWeeks, volumeOfSets, workoutDurationMs, workoutVolume } from './metrics';
import { exercise, set, workout } from '../test/factory';

describe('Volumen', () => {
  it('summiert Gewicht × Wiederholungen der Arbeitssätze', () => {
    expect(volumeOfSets([set(100, 5), set(80, 10)])).toBe(1300);
  });
  it('ignoriert Aufwärmsätze', () => {
    expect(volumeOfSets([set(40, 10, 'warmup'), set(100, 5)])).toBe(500);
  });
  it('rechnet über alle Übungen eines Workouts', () => {
    const w = workout('2026-03-02T18:00:00', [
      { ex: 'a', sets: [set(50, 10)] },
      { ex: 'b', sets: [set(20, 10), set(20, 8, 'warmup')] },
    ]);
    expect(workoutVolume(w)).toBe(700);
  });
});

describe('Geschätztes 1RM (Epley)', () => {
  it('berechnet gewicht × (1 + wdh / 30)', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.333, 2);
    expect(epley1RM(100, 1)).toBeCloseTo(103.333, 2);
  });
  it('gilt nur für 1 bis 12 Wiederholungen', () => {
    expect(epley1RM(100, 0)).toBeNull();
    expect(epley1RM(100, 13)).toBeNull();
    expect(epley1RM(100, 12)).toBeCloseTo(140);
  });
  it('liefert kein 1RM ohne Gewicht', () => {
    expect(epley1RM(0, 10)).toBeNull();
  });
});

describe('Rekorde', () => {
  const w1 = workout('2026-03-02T18:00:00', [{ ex: 'bench', sets: [set(80, 8), set(80, 6)] }]);
  const w2 = workout('2026-03-05T18:00:00', [{ ex: 'bench', sets: [set(85, 5), set(60, 20)] }]);
  const w3 = workout('2026-03-09T18:00:00', [{ ex: 'bench', sets: [set(70, 5)] }]);

  it('ermittelt höchstes Gewicht, 1RM und Satzvolumen', () => {
    const { records } = analyzeRecords([w3, w1, w2]);
    const r = records.get('bench')!;
    expect(r.weight?.value).toBe(85);
    expect(r.e1rm?.value).toBeCloseTo(80 * (1 + 8 / 30));
    expect(r.setVolume?.value).toBe(1200);
    expect(r.setVolume?.workoutId).toBe(w2.id);
  });

  it('zählt die erste Einheit nicht als neuen Rekord', () => {
    expect(recordsInWorkout([w1, w2], w1.id)).toEqual([]);
  });

  it('meldet verbesserte Rekorde im Workout', () => {
    const events = recordsInWorkout([w1, w2, w3], w2.id);
    expect(events.map((e) => e.type).sort()).toEqual(['setVolume', 'weight']);
    expect(recordsInWorkout([w1, w2, w3], w3.id)).toEqual([]);
  });

  it('liefert den letzten Rekord', () => {
    expect(latestRecord([w1, w2, w3])?.workoutId).toBe(w2.id);
    expect(latestRecord([w1])).toBeNull();
  });

  it('ignoriert laufende Workouts', () => {
    const running = { ...w2, finishedAt: undefined };
    expect(analyzeRecords([w1, running]).events).toEqual([]);
  });
});

describe('Streak', () => {
  const now = new Date('2026-03-18T12:00:00'); // Mittwoch
  it('zählt aufeinanderfolgende Wochen mit Workout', () => {
    const ws = [workout('2026-03-16T18:00:00', []), workout('2026-03-10T18:00:00', []), workout('2026-03-03T18:00:00', [])];
    expect(streakWeeks(ws, now)).toBe(3);
  });
  it('die laufende Woche ohne Workout bricht die Serie nicht', () => {
    const ws = [workout('2026-03-10T18:00:00', []), workout('2026-03-03T18:00:00', [])];
    expect(streakWeeks(ws, now)).toBe(2);
  });
  it('eine Lücke beendet die Serie', () => {
    const ws = [workout('2026-03-16T18:00:00', []), workout('2026-03-03T18:00:00', [])];
    expect(streakWeeks(ws, now)).toBe(1);
  });
  it('ohne Workouts ist der Streak 0', () => {
    expect(streakWeeks([], now)).toBe(0);
  });
  it('mehrere Workouts in einer Woche zählen einmal', () => {
    const ws = [workout('2026-03-16T18:00:00', []), workout('2026-03-17T18:00:00', [])];
    expect(streakWeeks(ws, now)).toBe(1);
  });
});

describe('Dauer und Historie', () => {
  it('zieht Pausen ab', () => {
    const w = workout('2026-03-02T18:00:00', [], { pausedMs: 10 * 60000 });
    expect(workoutDurationMs(w)).toBe(50 * 60000);
  });
  it('liefert Einheiten einer Übung, älteste zuerst, nur Arbeitssätze', () => {
    const a = workout('2026-03-05T18:00:00', [{ ex: 'x', sets: [set(10, 10, 'warmup'), set(20, 8)] }]);
    const b = workout('2026-03-02T18:00:00', [{ ex: 'x', sets: [set(15, 8)] }]);
    const h = exerciseHistory([a, b], 'x');
    expect(h.map((s) => s.workoutId)).toEqual([b.id, a.id]);
    expect(h[1].sets).toHaveLength(1);
  });
});

describe('Workout-Fortschritt', () => {
  const byId = new Map([['a', exercise('a', ['chest'])], ['b', exercise('b', ['lats'])]]);
  it('zählt erledigte von geplanten Sätzen, ohne Vorgabe die untere Empfehlung', () => {
    const w = workout('2026-03-02T18:00:00', [
      { ex: 'a', sets: [set(50, 10), set(50, 10)] },
      { ex: 'b', sets: [] },
    ]);
    w.entries[0].target = { sets: 4, reps: [8, 12] };
    expect(workoutProgress(w, byId)).toEqual({ done: 2, planned: 7, percent: 29 });
  });
  it('Zusatzsätze heben eine Übung nicht über 100 %', () => {
    const w = workout('2026-03-02T18:00:00', [
      { ex: 'a', sets: [set(50, 10), set(50, 10), set(50, 10), set(50, 10), set(50, 10)] },
      { ex: 'b', sets: [set(20, 10)] },
    ]);
    expect(workoutProgress(w, byId)).toEqual({ done: 4, planned: 6, percent: 67 });
  });
  it('ohne Übungen 0 %', () => {
    expect(workoutProgress(workout('2026-03-02T18:00:00', []), byId).percent).toBe(0);
  });
});
