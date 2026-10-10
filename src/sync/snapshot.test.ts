import { describe, expect, it } from 'vitest';
import { emptySnapshot, fingerprint, mergeSnapshots, type Snapshot } from './snapshot';
import { DEFAULT_SETTINGS } from '../db/seed';
import { workout } from '../test/factory';

const w = (id: string, updatedAt: string, name = id) => ({ ...workout('2026-03-01T18:00:00', []), id, updatedAt, name });
const snap = (patch: Partial<Snapshot>): Snapshot => ({ ...emptySnapshot(), ...patch });

describe('Zusammenführen', () => {
  it('vereinigt Datensätze beider Seiten', () => {
    const m = mergeSnapshots(snap({ workouts: [w('a', '1')] }), snap({ workouts: [w('b', '1')] }));
    expect(m.workouts.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('der neuere Stand gewinnt, bei Gleichstand der lokale', () => {
    const local = snap({ workouts: [w('a', '2026-03-02', 'lokal'), w('b', '2026-03-01', 'lokal')] });
    const remote = snap({ workouts: [w('a', '2026-03-01', 'server'), w('b', '2026-03-05', 'server')] });
    const m = mergeSnapshots(local, remote);
    expect(m.workouts.find((x) => x.id === 'a')?.name).toBe('lokal');
    expect(m.workouts.find((x) => x.id === 'b')?.name).toBe('server');
    const tie = mergeSnapshots(snap({ workouts: [w('c', 'x', 'lokal')] }), snap({ workouts: [w('c', 'x', 'server')] }));
    expect(tie.workouts[0].name).toBe('lokal');
  });

  it('Löschungen gelten auf beiden Seiten', () => {
    const local = snap({ workouts: [w('a', '1')], deleted: ['workouts:b'] });
    const remote = snap({ workouts: [w('a', '1'), w('b', '1')], deleted: ['workouts:a'] });
    const m = mergeSnapshots(local, remote);
    expect(m.workouts).toEqual([]);
    expect(m.deleted).toEqual(['workouts:a', 'workouts:b']);
  });

  it('Grabsteine gelten nur für ihre Tabelle', () => {
    const m = mergeSnapshots(snap({ deleted: ['plans:a'] }), snap({ workouts: [w('a', '1')] }));
    expect(m.workouts).toHaveLength(1);
  });

  it('Einstellungen: neuerer Stand gewinnt', () => {
    const local = snap({ settings: { ...DEFAULT_SETTINGS, name: 'Lokal', updatedAt: '2026-01-01' } });
    const remote = snap({ settings: { ...DEFAULT_SETTINGS, name: 'Server', updatedAt: '2026-02-01' } });
    expect(mergeSnapshots(local, remote).settings?.name).toBe('Server');
    expect(mergeSnapshots(local, snap({})).settings?.name).toBe('Lokal');
  });

  it('Fingerabdruck hängt nicht von der Reihenfolge ab', () => {
    const a = snap({ workouts: [w('a', '1'), w('b', '2')], deleted: ['x', 'y'] });
    const b = snap({ workouts: [w('b', '2'), w('a', '1')], deleted: ['y', 'x'] });
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(a)).not.toBe(fingerprint(snap({ workouts: [w('a', '1'), w('b', '3')] })));
  });
});
