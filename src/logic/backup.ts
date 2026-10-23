import type { BodyLog, Exercise, Plan, Settings, Workout } from '../types';

export interface Backup {
  app: 'athletic';
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  plans: Plan[];
  workouts: Workout[];
  bodyLogs: BodyLog[];
  settings: Settings;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function checkArray(data: Record<string, unknown>, key: string, check: (x: Record<string, unknown>) => boolean): void {
  const list = data[key];
  if (!Array.isArray(list)) throw new Error(`Feld „${key}“ fehlt oder ist keine Liste.`);
  list.forEach((x, i) => {
    if (!isObj(x) || !isStr(x.id) || !check(x)) throw new Error(`Eintrag ${i + 1} in „${key}“ ist ungültig.`);
  });
}

/** Prüft eine importierte Sicherung. Wirft einen Fehler mit verständlicher Meldung. */
export function parseBackup(raw: unknown): Backup {
  if (!isObj(raw) || raw.app !== 'athletic') throw new Error('Das ist keine ATHLETIC-Sicherung.');
  if (raw.version !== 1) throw new Error('Diese Sicherung stammt aus einer unbekannten Version.');
  checkArray(raw, 'exercises', (e) => isStr(e.name) && Array.isArray(e.primary));
  checkArray(raw, 'plans', (p) => isStr(p.name) && Array.isArray(p.days));
  checkArray(raw, 'workouts', (w) =>
    isStr(w.startedAt) &&
    Array.isArray(w.entries) &&
    (w.entries as unknown[]).every((e) => isObj(e) && isStr(e.exerciseId) && Array.isArray(e.sets) && (e.sets as unknown[]).every((s) => isObj(s) && isNum(s.weight) && isNum(s.reps))),
  );
  checkArray(raw, 'bodyLogs', (b) => isStr(b.date));
  if (!isObj(raw.settings)) throw new Error('Einstellungen fehlen.');
  return raw as unknown as Backup;
}

export function makeBackup(data: Omit<Backup, 'app' | 'version' | 'exportedAt'>, now = new Date()): Backup {
  return { app: 'athletic', version: 1, exportedAt: now.toISOString(), ...data };
}
