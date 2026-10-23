import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { AthleticDB } from '../db/db';
import { installTracking, onLocalChange, withoutTracking } from './tracking';
import { workout } from '../test/factory';

describe('Änderungsverfolgung', () => {
  it('stempelt Änderungen, meldet Löschungen und schweigt beim Einspielen', async () => {
    const db = new AthleticDB(`track-${Math.random()}`);
    installTracking(db);
    const changes: { table: string; deleted?: string }[] = [];
    onLocalChange((c) => changes.push(c));

    const w = workout('2026-03-01T18:00:00', []);
    await db.workouts.put(w);
    const stored = await db.workouts.get(w.id);
    expect(stored?.updatedAt).toBeTruthy();

    await new Promise((r) => setTimeout(r, 5));
    await db.workouts.put({ ...w, name: 'Neu' });
    expect((await db.workouts.get(w.id))!.updatedAt! >= stored!.updatedAt!).toBe(true);

    await db.workouts.delete(w.id);
    await new Promise((r) => setTimeout(r, 0));
    expect(changes.some((c) => c.deleted === `workouts:${w.id}`)).toBe(true);

    const before = changes.length;
    const remote = { ...workout('2026-03-02T18:00:00', []), updatedAt: '2020-01-01T00:00:00.000Z' };
    await withoutTracking(() => db.workouts.put(remote));
    await new Promise((r) => setTimeout(r, 0));
    expect(changes.length).toBe(before);
    expect((await db.workouts.get(remote.id))?.updatedAt).toBe('2020-01-01T00:00:00.000Z');
  });
});
