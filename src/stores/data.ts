import { db } from '../db/db';
import { DEFAULT_SETTINGS, ensureSeeded } from '../db/seed';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { makeBackup, parseBackup } from '../logic/backup';
import { useSettings } from './settings';
import { useExercises } from './exercises';
import { usePlans } from './plans';
import { useWorkouts } from './workouts';
import { useBody } from './body';
import { installTracking } from '../sync/tracking';
import { markReset } from '../sync/engine';

/** Lädt alle Daten aus IndexedDB in die Stores. Beim ersten Start werden Beispieldaten angelegt. */
export async function loadAll(): Promise<void> {
  installTracking(db);
  await ensureSeeded(db);
  const [exercises, plans, workouts, bodyLogs, settings] = await Promise.all([
    db.exercises.toArray(),
    db.plans.toArray(),
    db.workouts.toArray(),
    db.bodyLogs.toArray(),
    db.settings.get('settings'),
  ]);
  useExercises.getState().setAll(exercises);
  usePlans.getState().setAll(plans);
  useWorkouts.getState().setAll(workouts);
  useBody.getState().setAll(bodyLogs);
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, ...settings } });
}

/** Entfernt Beispiel-Workouts und -Körperwerte. Die Übungsbibliothek bleibt. */
export async function removeSampleData(keepPlans: boolean): Promise<void> {
  await db.transaction('rw', db.allTables, async () => {
    await db.workouts.filter((w) => Boolean(w.sample)).delete();
    await db.bodyLogs.filter((b) => Boolean(b.sample)).delete();
    if (!keepPlans) await db.plans.filter((p) => Boolean(p.sample)).delete();
  });
  const plans = await db.plans.toArray();
  const { settings } = useSettings.getState();
  const activeStillExists = plans.some((p) => p.id === settings.activePlanId);
  await useSettings.getState().update({ hasSampleData: false, activePlanId: activeStillExists ? settings.activePlanId : plans[0]?.id });
  await loadAll();
}

/** Löscht alles. Die eingebaute Übungsbibliothek wird neu angelegt, das Onboarding startet erneut. */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.allTables, async () => {
    for (const t of db.allTables) await t.clear();
    await db.exercises.bulkPut(BUILTIN_EXERCISES);
    await db.settings.put({ ...DEFAULT_SETTINGS });
  });
  await markReset();
  await loadAll();
}

export async function exportData(): Promise<Blob> {
  const [exercises, plans, workouts, bodyLogs, settings] = await Promise.all([
    db.exercises.toArray(),
    db.plans.toArray(),
    db.workouts.toArray(),
    db.bodyLogs.toArray(),
    db.settings.get('settings'),
  ]);
  const backup = makeBackup({ exercises, plans, workouts, bodyLogs, settings: settings ?? DEFAULT_SETTINGS });
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

/** Ersetzt alle Daten durch die Sicherung. */
export async function importData(text: string): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const b = parseBackup(raw);
  await db.transaction('rw', db.allTables, async () => {
    for (const t of db.allTables) await t.clear();
    await db.exercises.bulkPut(b.exercises);
    await db.plans.bulkPut(b.plans);
    await db.workouts.bulkPut(b.workouts);
    await db.bodyLogs.bulkPut(b.bodyLogs);
    await db.settings.put({ ...DEFAULT_SETTINGS, ...b.settings, id: 'settings' });
  });
  await markReset();
  await loadAll();
}
