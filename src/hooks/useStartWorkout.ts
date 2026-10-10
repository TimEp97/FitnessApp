import { useNavigate } from 'react-router-dom';
import type { Plan, PlanDay } from '../types';
import { useWorkouts } from '../stores/workouts';

/** Startet ein Workout (oder setzt das laufende fort) und öffnet den Tracker. */
export function useStartWorkout() {
  const navigate = useNavigate();
  return async (plan?: Plan, day?: PlanDay) => {
    if (!useWorkouts.getState().active) await useWorkouts.getState().start({ plan, day });
    navigate('/workout');
  };
}
