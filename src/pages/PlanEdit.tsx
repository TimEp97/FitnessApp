import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Plan, PlanDay, PlanItem } from '../types';
import { usePlans } from '../stores/plans';
import { useSettings } from '../stores/settings';
import { useExercises } from '../stores/exercises';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { SortableList } from '../components/SortableList';
import { ExercisePicker } from '../components/ExercisePicker';
import { EmptyState } from '../components/EmptyState';
import { uid } from '../logic/dates';
import { daySetCount, duplicatePlan, moveItem } from '../logic/planning';
import s from './PlanEdit.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

export function PlanEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = usePlans((st) => st.plans.find((p) => p.id === id));
  const activeId = useSettings((st) => st.settings.activePlanId);
  const byId = useExercises((st) => st.byId);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ dayId: string; index: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDay, setConfirmDay] = useState<string | null>(null);

  if (!plan) {
    return (
      <Page title="Plan" back={<BackLink />}>
        <EmptyState icon="dumbbell" title="Plan nicht gefunden" action={<Link to="/training" className="btn">Zur Übersicht</Link>} />
      </Page>
    );
  }

  const save = (p: Plan) => usePlans.getState().save(p);
  const updateDay = (dayId: string, fn: (d: PlanDay) => PlanDay) => save({ ...plan, days: plan.days.map((d) => (d.id === dayId ? fn(d) : d)) });
  const updateItem = (dayId: string, index: number, patch: Partial<PlanItem>) =>
    updateDay(dayId, (d) => ({ ...d, items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  const editDay = editing ? plan.days.find((d) => d.id === editing.dayId) : undefined;
  const editItem = editDay?.items[editing!.index];
  const pickDay = plan.days.find((d) => d.id === pickerDay);

  return (
    <Page title={plan.name || 'Plan'} back={<BackLink />}>
      <div className="stack">
        <label className="fieldLabel" htmlFor="plan-name">
          Name des Plans
        </label>
        <input id="plan-name" className="input" value={plan.name} onChange={(e) => save({ ...plan, name: e.target.value })} maxLength={60} />
        {plan.id !== activeId && (
          <button type="button" className="btn btnBlock" onClick={() => usePlans.getState().activate(plan.id)}>
            Als aktiven Plan festlegen
          </button>
        )}
      </div>

      <div className="grid">
        {plan.days.map((day, di) => (
          <section key={day.id} className="card stack" aria-label={day.name}>
            <div className="row">
              <label className="srOnly" htmlFor={`day-${day.id}`}>
                Name von Tag {di + 1}
              </label>
              <input id={`day-${day.id}`} className={`input ${s.dayName}`} value={day.name} onChange={(e) => updateDay(day.id, (d) => ({ ...d, name: e.target.value }))} maxLength={40} />
              {plan.days.length > 1 && (
                <button type="button" className="iconBtn iconBtnGhost" aria-label={`${day.name} löschen`} onClick={() => setConfirmDay(day.id)}>
                  <Icon name="trash" size={20} />
                </button>
              )}
            </div>
            <p className="muted small">
              {day.items.length} Übungen · {daySetCount(day)} Sätze
            </p>
            {day.items.length > 0 && (
              <SortableList
                items={day.items}
                getKey={(it, i) => `${it.exerciseId}-${i}`}
                getLabel={(it) => byId.get(it.exerciseId)?.name ?? 'Übung'}
                onMove={(from, to) => updateDay(day.id, (d) => ({ ...d, items: moveItem(d.items, from, to) }))}
                render={(it, i) => (
                  <>
                    {byId.get(it.exerciseId) && <ExerciseImage exercise={byId.get(it.exerciseId)!} size="thumb" decorative />}
                    <span className={s.itemName}>{byId.get(it.exerciseId)?.name ?? 'Unbekannte Übung'}</span>
                    <button type="button" className={`btn ${s.target}`} onClick={() => setEditing({ dayId: day.id, index: i })} aria-label={`Vorgabe ändern: ${it.sets} Sätze, ${it.reps[0]} bis ${it.reps[1]} Wiederholungen`}>
                      <span className="num">
                        {it.sets} × {it.reps[0]}–{it.reps[1]}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="iconBtn iconBtnGhost"
                      aria-label={`${byId.get(it.exerciseId)?.name ?? 'Übung'} entfernen`}
                      onClick={() => updateDay(day.id, (d) => ({ ...d, items: d.items.filter((_, x) => x !== i) }))}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </>
                )}
              />
            )}
            <button type="button" className="btn btnBlock" onClick={() => setPickerDay(day.id)}>
              <Icon name="plus" size={20} /> Übung hinzufügen
            </button>
          </section>
        ))}
      </div>

      <button
        type="button"
        className="btn btnBlock"
        onClick={() => save({ ...plan, days: [...plan.days, { id: uid(), name: `Tag ${plan.days.length + 1}`, items: [] }] })}
      >
        <Icon name="plus" size={20} /> Tag hinzufügen
      </button>

      <div className="row wrap">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const copy = duplicatePlan(plan);
            await save(copy);
            navigate(`/training/plan/${copy.id}`, { replace: true });
          }}
        >
          <Icon name="copy" size={20} /> Duplizieren
        </button>
        <button type="button" className="btn btnDanger" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={20} /> Plan löschen
        </button>
      </div>

      <Link to="/training" className="btn btnPrimary btnBlock btnLg">
        Fertig
      </Link>

      <ExercisePicker
        open={Boolean(pickDay)}
        onClose={() => setPickerDay(null)}
        existing={new Set(pickDay?.items.map((i) => i.exerciseId))}
        title={pickDay ? `Übung für ${pickDay.name}` : 'Übung hinzufügen'}
        onPick={(exId) => {
          const ex = byId.get(exId);
          if (!pickDay || !ex) return;
          updateDay(pickDay.id, (d) => ({ ...d, items: [...d.items, { exerciseId: exId, sets: ex.recommended.sets[0], reps: [...ex.recommended.reps] as [number, number] }] }));
          setPickerDay(null);
        }}
      />

      <Sheet open={Boolean(editItem)} onClose={() => setEditing(null)} title={editItem ? (byId.get(editItem.exerciseId)?.name ?? 'Vorgabe') : 'Vorgabe'}>
        {editItem && editing && (
          <>
            <Stepper size="sm" label="Sätze" value={editItem.sets} step={1} min={1} max={10} onChange={(v) => v !== null && updateItem(editing.dayId, editing.index, { sets: v })} />
            <Stepper
              size="sm"
              label="Wdh. von"
              value={editItem.reps[0]}
              step={1}
              min={1}
              max={100}
              onChange={(v) => v !== null && updateItem(editing.dayId, editing.index, { reps: [v, Math.max(v, editItem.reps[1])] })}
            />
            <Stepper
              size="sm"
              label="Wdh. bis"
              value={editItem.reps[1]}
              step={1}
              min={1}
              max={100}
              onChange={(v) => v !== null && updateItem(editing.dayId, editing.index, { reps: [Math.min(v, editItem.reps[0]), v] })}
            />
            <button type="button" className="btn btnBlock" onClick={() => setEditing(null)}>
              Übernehmen
            </button>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        title="Plan löschen?"
        message={`„${plan.name}“ wird gelöscht. Bereits protokollierte Workouts bleiben erhalten.`}
        confirmLabel="Plan löschen"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await usePlans.getState().remove(plan.id);
          navigate('/training', { replace: true });
        }}
      />
      <ConfirmSheet
        open={Boolean(confirmDay)}
        title="Tag löschen?"
        message="Der Tag und seine Übungsliste werden entfernt."
        confirmLabel="Tag löschen"
        danger
        onClose={() => setConfirmDay(null)}
        onConfirm={() => {
          save({ ...plan, days: plan.days.filter((d) => d.id !== confirmDay) });
          setConfirmDay(null);
        }}
      />
    </Page>
  );
}

function BackLink() {
  return (
    <Link to="/training" className="btnLink">
      <Icon name="chevronLeft" size={20} /> Training
    </Link>
  );
}
