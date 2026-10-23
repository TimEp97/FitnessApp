import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { AthleticDB } from './db';
import { ensureSeeded, generateSampleData } from './seed';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { DAY_MS } from '../logic/dates';

describe('Beispieldaten', () => {
  const now = new Date('2026-10-09T12:00:00');

  it('drei Pläne und Workouts der letzten 12 Wochen', () => {
    const data = generateSampleData(BUILTIN_EXERCISES, now);
    expect(data.plans).toHaveLength(3);
    expect(data.workouts.length).toBeGreaterThan(30);
    const oldest = Math.min(...data.workouts.map((w) => new Date(w.startedAt).getTime()));
    expect(now.getTime() - oldest).toBeLessThanOrEqual(13 * 7 * DAY_MS);
    expect(data.workouts.every((w) => w.finishedAt && w.sample && new Date(w.startedAt) < now)).toBe(true);
    expect(data.plans.map((p) => p.id)).toContain(data.activePlanId);
  });

  it('legt beim ersten Start alles an und beim zweiten nichts doppelt', async () => {
    const db = new AthleticDB(`test-${Math.random()}`);
    await ensureSeeded(db, now);
    const count = await db.workouts.count();
    expect(await db.exercises.count()).toBe(BUILTIN_EXERCISES.length);
    expect((await db.settings.get('settings'))?.hasSampleData).toBe(true);
    await ensureSeeded(db, now);
    expect(await db.workouts.count()).toBe(count);
  });
});
