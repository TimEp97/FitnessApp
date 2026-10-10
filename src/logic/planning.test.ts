import { describe, expect, it } from 'vitest';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { PLAN_TEMPLATES } from '../data/templates';
import { estimateMinutes, moveItem, nextPlanDay, planFromTemplate, plannedWeekdays, recommendTemplate } from './planning';
import { workout } from '../test/factory';

const ppl = PLAN_TEMPLATES.find((t) => t.id === 'ppl')!;

describe('Planung', () => {
  it('alle Vorlagen verweisen auf vorhandene Übungen', () => {
    const ids = new Set(BUILTIN_EXERCISES.map((e) => e.id));
    for (const t of PLAN_TEMPLATES) for (const d of t.days) for (const [id] of d.items) expect(ids.has(id), id).toBe(true);
  });

  it('die Bibliothek hat rund 50 Übungen mit eindeutigen IDs', () => {
    expect(BUILTIN_EXERCISES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(BUILTIN_EXERCISES.map((e) => e.id)).size).toBe(BUILTIN_EXERCISES.length);
  });

  it('nächster Plantag folgt auf den zuletzt trainierten', () => {
    const plan = planFromTemplate(ppl, BUILTIN_EXERCISES);
    expect(nextPlanDay(plan, [])?.id).toBe(plan.days[0].id);
    const w = workout('2026-03-02T18:00:00', [], { planId: plan.id, planDayId: plan.days[2].id });
    expect(nextPlanDay(plan, [w])?.id).toBe(plan.days[0].id);
    const w2 = workout('2026-03-01T18:00:00', [], { planId: plan.id, planDayId: plan.days[0].id });
    expect(nextPlanDay(plan, [w, w2])?.id).toBe(plan.days[0].id);
  });

  it('ersetzt Übungen ohne passendes Equipment', () => {
    const plan = planFromTemplate(ppl, BUILTIN_EXERCISES, { equipment: ['dumbbell', 'bodyweight'] });
    const byId = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]));
    for (const d of plan.days) for (const it of d.items) expect(['dumbbell', 'bodyweight']).toContain(byId.get(it.exerciseId)!.equipment);
    expect(plan.days[0].items.length).toBeGreaterThan(2);
  });

  it('passt Wiederholungen an das Ziel an', () => {
    const plan = planFromTemplate(ppl, BUILTIN_EXERCISES, { goal: 'endurance' });
    expect(plan.days.flatMap((d) => d.items).every((i) => i.reps[0] === 15)).toBe(true);
  });

  it('empfiehlt Vorlagen nach Trainingstagen', () => {
    expect(recommendTemplate({ daysPerWeek: 2, experience: 'advanced' }).id).toBe('full-body');
    expect(recommendTemplate({ daysPerWeek: 3, experience: 'intermediate' }).id).toBe('ppl');
    expect(recommendTemplate({ daysPerWeek: 4, experience: 'advanced' }).id).toBe('four-day-split');
  });

  it('Hilfsfunktionen', () => {
    expect(plannedWeekdays(3)).toEqual([0, 2, 4]);
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(estimateMinutes({ id: 'd', name: 'd', items: [{ exerciseId: 'x', sets: 15, reps: [8, 12] }] }, 120)).toBe(45);
  });
});
