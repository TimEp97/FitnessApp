import type { Workout } from '../types';
import { useWorkouts } from '../stores/workouts';
import { fmtDateLong } from '../logic/format';
import { DoubleConfirmSheet } from './Sheet';

/** Löscht ein abgeschlossenes Training nach zwei Rückfragen. */
export function DeleteWorkoutSheet({ workout, onClose, onDeleted }: { workout: Workout | null; onClose: () => void; onDeleted?: () => void }) {
  const label = workout ? `„${workout.name}“ vom ${fmtDateLong(workout.startedAt)}` : '';
  return (
    <DoubleConfirmSheet
      open={workout !== null}
      title="Training löschen?"
      message={`${label} wird mit allen Sätzen gelöscht. Statistiken und Rekorde werden neu berechnet.`}
      confirmLabel="Weiter"
      secondTitle="Wirklich löschen?"
      secondMessage={`${label} lässt sich danach nicht wiederherstellen.`}
      secondConfirmLabel="Ja, Training löschen"
      onClose={onClose}
      onConfirm={async () => {
        if (!workout) return;
        await useWorkouts.getState().deleteWorkout(workout.id);
        onClose();
        onDeleted?.();
      }}
    />
  );
}
