import { describe, expect, it } from 'vitest';
import { makeBackup, parseBackup } from './backup';
import { DEFAULT_SETTINGS } from '../db/seed';
import { set, workout } from '../test/factory';

describe('Sicherung', () => {
  const valid = makeBackup({ exercises: [], plans: [], workouts: [workout('2026-03-01T18:00:00', [{ ex: 'a', sets: [set(10, 10)] }])], bodyLogs: [], settings: DEFAULT_SETTINGS });

  it('akzeptiert eine gültige Sicherung', () => {
    expect(parseBackup(JSON.parse(JSON.stringify(valid))).workouts).toHaveLength(1);
  });
  it('lehnt fremde Dateien ab', () => {
    expect(() => parseBackup({ foo: 1 })).toThrow(/keine ATHLETIC-Sicherung/);
  });
  it('meldet ungültige Einträge', () => {
    const broken = { ...valid, workouts: [{ id: 'x', startedAt: 'a', entries: [{ exerciseId: 'a', sets: [{ weight: 'schwer', reps: 5 }] }] }] };
    expect(() => parseBackup(broken)).toThrow(/Eintrag 1 in „workouts“/);
  });
});
