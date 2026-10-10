import { describe, expect, it } from 'vitest';
import { LOAD_THRESHOLDS, loadLevel, muscleLoad, muscleSets } from './muscleLoad';
import { exercise, set, workout } from '../test/factory';

const bench = exercise('bench', ['chest'], ['triceps', 'deltsFront']);
const curl = exercise('curl', ['biceps']);
const exById = new Map([bench, curl].map((e) => [e.id, e]));
const now = new Date('2026-03-20T12:00:00');

describe('Belastungsstufen', () => {
  it('ordnet die Schwellen aus der Spezifikation zu', () => {
    expect(loadLevel(0)).toBe('none');
    expect(loadLevel(3.5)).toBe('none');
    expect(loadLevel(4)).toBe('ok');
    expect(loadLevel(12)).toBe('ok');
    expect(loadLevel(12.5)).toBe('high');
    expect(loadLevel(18)).toBe('high');
    expect(loadLevel(18.5)).toBe('veryHigh');
  });
  it('Schwellen sind als Konstanten änderbar', () => {
    expect(LOAD_THRESHOLDS).toEqual({ low: 4, okMax: 12, highMax: 18 });
  });
});

describe('Muskelbelastung', () => {
  it('primär 1 Satz, sekundär 0,5 Sätze, Aufwärmsätze zählen nicht', () => {
    const w = workout('2026-03-18T18:00:00', [{ ex: 'bench', sets: [set(60, 10, 'warmup'), set(80, 8), set(80, 8), set(80, 8), set(80, 8)] }]);
    const counts = muscleSets([w], exById, new Date('2026-03-01'), new Date('2026-04-01'));
    expect(counts.chest.sets).toBe(4);
    expect(counts.triceps.sets).toBe(2);
    expect(counts.deltsFront.sets).toBe(2);
    expect(counts.biceps.sets).toBe(0);
    expect(counts.chest.volume).toBe(2560);
    expect(counts.triceps.volume).toBe(1280);
  });

  it('7 Tage: Sätze direkt, außerhalb des Zeitraums zählt nichts', () => {
    const inside = workout('2026-03-18T18:00:00', [{ ex: 'curl', sets: Array.from({ length: 13 }, () => set(15, 10)) }]);
    const outside = workout('2026-03-01T18:00:00', [{ ex: 'curl', sets: Array.from({ length: 20 }, () => set(15, 10)) }]);
    const load = muscleLoad([inside, outside], exById, 7, now);
    expect(load.biceps.sets).toBe(13);
    expect(load.biceps.level).toBe('high');
    expect(load.biceps.lastTrained).toBe(inside.startedAt);
  });

  it('30 Tage werden auf einen Wochenschnitt umgerechnet', () => {
    const ws = [5, 12, 19, 26].map((d) => workout(`2026-02-${String(d).padStart(2, '0')}T18:00:00`, [{ ex: 'curl', sets: [set(15, 10), set(15, 10), set(15, 10)] }]));
    // im Fenster (seit 18.02.) liegen 2 Workouts mit je 3 Sätzen
    const load = muscleLoad(ws, exById, 30, now);
    expect(load.biceps.sets).toBe(6);
    expect(load.biceps.weekly).toBeCloseTo((6 * 7) / 30);
    expect(load.biceps.level).toBe('none');
  });
});
