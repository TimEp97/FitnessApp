import Dexie, { type Table } from 'dexie';
import type { BodyLog, Exercise, Plan, Settings, Workout } from '../types';

export class AthleticDB extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<Plan, string>;
  workouts!: Table<Workout, string>;
  bodyLogs!: Table<BodyLog, string>;
  settings!: Table<Settings, string>;

  constructor(name = 'athletic') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name',
      plans: 'id',
      workouts: 'id, startedAt',
      bodyLogs: 'id, date',
      settings: 'id',
    });
  }

  get allTables() {
    return [this.exercises, this.plans, this.workouts, this.bodyLogs, this.settings];
  }
}

export const db = new AthleticDB();
