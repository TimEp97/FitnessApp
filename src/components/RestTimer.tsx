import { useEffect } from 'react';
import { useWorkouts } from '../stores/workouts';
import { useNow } from '../hooks/useNow';
import { fmtDuration } from '../logic/format';
import s from './RestTimer.module.css';

/** Pausen-Timer als schmale Leiste über der Tab-Leiste. */
export function RestTimer() {
  const end = useWorkouts((st) => st.active?.cursor?.restEndsAt);
  const total = useWorkouts((st) => st.active?.cursor?.restTotal ?? 0);
  const now = useNow(end ? 250 : null);
  const remaining = end ? new Date(end).getTime() - now : 0;

  useEffect(() => {
    if (end && remaining <= 0) {
      navigator.vibrate?.([120, 80, 120]);
      void useWorkouts.getState().skipRest();
    }
  }, [end, remaining]);

  if (!end || remaining <= 0) return null;
  const pct = total > 0 ? Math.min(100, (remaining / (total * 1000)) * 100) : 0;
  return (
    <div className={s.bar} role="timer" aria-label="Pausen-Timer" data-testid="rest-timer">
      <div className={s.fill} style={{ width: `${pct}%` }} />
      <div className={s.content}>
        <span className={s.label}>Pause</span>
        <span className={`num ${s.time}`}>{fmtDuration(remaining + 999)}</span>
        <span className="spacer" />
        <button type="button" className={s.btn} onClick={() => useWorkouts.getState().addRest(30)}>
          +30 s
        </button>
        <button type="button" className={s.btn} onClick={() => useWorkouts.getState().skipRest()}>
          Überspringen
        </button>
      </div>
    </div>
  );
}
