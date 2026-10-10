import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MuscleId } from '../types';
import { useWorkouts } from '../stores/workouts';
import { useExercises } from '../stores/exercises';
import { Page } from '../components/Page';
import { BodyMap } from '../components/BodyMap';
import { Segmented } from '../components/Segmented';
import { BarChart } from '../components/charts/BarChart';
import { EmptyState } from '../components/EmptyState';
import { MUSCLES, MUSCLE_LABEL } from '../data/labels';
import { LOAD_COLOR, LOAD_LABEL, LOAD_THRESHOLDS, muscleLoad, muscleWeeklyHistory, type LoadLevel } from '../logic/muscleLoad';
import { analyzeRecords } from '../logic/metrics';
import { addDays, daysBetween, startOfWeek } from '../logic/dates';
import { fmtNumber, fmtVolume, fmtWeight, relativeDays } from '../logic/format';
import s from './Muscles.module.css';
import { ExerciseImage } from '../components/ExerciseImage';

const RANGES = [
  { value: 7, label: '7 Tage' },
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' },
];

export function Muscles() {
  const workouts = useWorkouts((st) => st.workouts);
  const exercises = useExercises((st) => st.exercises);
  const byId = useExercises((st) => st.byId);
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<MuscleId>('chest');

  const now = new Date();
  const load = useMemo(() => muscleLoad(workouts, byId, days), [workouts, byId, days]);
  const colors = Object.fromEntries(MUSCLES.map((m) => [m, LOAD_COLOR[load[m].level]])) as Record<MuscleId, string>;
  const stat = load[selected];
  const weekStart = startOfWeek(now);
  const history = useMemo(() => muscleWeeklyHistory(workouts, byId, selected, 8, weekStart), [workouts, byId, selected, weekStart.getTime()]);
  const related = exercises.filter((e) => e.primary.includes(selected) || e.secondary.includes(selected)).sort((a, b) => Number(b.primary.includes(selected)) - Number(a.primary.includes(selected)));
  const records = useMemo(() => analyzeRecords(workouts).records, [workouts]);
  const best = related
    .filter((e) => e.primary.includes(selected))
    .map((e) => ({ e, r: records.get(e.id)?.e1rm }))
    .filter((x) => x.r)
    .sort((a, b) => b.r!.value - a.r!.value)[0];

  if (!workouts.length) {
    return (
      <Page title="Muskeln">
        <EmptyState icon="body" title="Noch keine Daten" text="Nach deinem ersten Workout zeigt die Karte, welche Muskeln du trainiert hast." action={<Link to="/training" className="btn btnPrimary btnLg">Zum Training</Link>} />
      </Page>
    );
  }

  return (
    <Page title="Muskeln" sample>
      <Segmented label="Zeitraum" options={RANGES} value={days} onChange={setDays} />
      <div className="grid">
        <section className="card stack" aria-label="Muskelkarte">
          <BodyMap colors={colors} selected={selected} onSelect={setSelected} label={`Muskelkarte, ausgewählt: ${MUSCLE_LABEL[selected]}`} />
          <ul className={s.legend} aria-label="Legende">
            {(['none', 'ok', 'high', 'veryHigh'] as LoadLevel[]).map((l) => (
              <li key={l}>
                <span className={s.swatch} style={{ background: LOAD_COLOR[l] }} aria-hidden="true" />
                {LOAD_LABEL[l]}
              </li>
            ))}
          </ul>
        </section>

        <div className="stack">
          <div className="chips" role="group" aria-label="Muskel auswählen">
            {MUSCLES.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={selected === m} onClick={() => setSelected(m)}>
                <span className={s.dot} style={{ background: LOAD_COLOR[load[m].level] }} aria-hidden="true" />
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>

          <section className="card stack" aria-labelledby="muscle-name" data-testid="muscle-detail">
            <div>
              <h2 id="muscle-name" className="h2">
                {MUSCLE_LABEL[selected]}
              </h2>
              <p className={s.status}>
                <span className={s.dot} style={{ background: LOAD_COLOR[stat.level] }} aria-hidden="true" />
                {LOAD_LABEL[stat.level]}
              </p>
            </div>
            <div className={s.facts}>
              <div>
                <span className={`num ${s.value}`}>{fmtNumber(stat.sets, 1)}</span>
                <span className={s.label}>Sätze in {days} Tagen{days > 7 ? ` · ${fmtNumber(stat.weekly, 1)} pro Woche` : ''}</span>
              </div>
              <div>
                <span className={`num ${s.value}`}>{fmtVolume(stat.volume)}</span>
                <span className={s.label}>Volumen</span>
              </div>
              <div>
                <span className={`${s.value} ${s.valueSm}`}>{stat.lastTrained ? relativeDays(daysBetween(new Date(stat.lastTrained), now)) : 'nie'}</span>
                <span className={s.label}>zuletzt trainiert</span>
              </div>
            </div>
            <div>
              <span className="label">Sätze pro Woche, letzte 8 Wochen</span>
              <BarChart
                height={110}
                label={`Sätze pro Woche für ${MUSCLE_LABEL[selected]}`}
                target={LOAD_THRESHOLDS.low}
                bars={history.map((v, i) => {
                  const start = addDays(weekStart, -7 * (7 - i));
                  return { label: i === 7 ? 'Jetzt' : `${start.getDate()}.${start.getMonth() + 1}.`, value: v, display: `${fmtNumber(v, 1)} Sätze` };
                })}
              />
            </div>
            {best && (
              <p>
                <span className="label">Bestleistung</span>
                <br />
                {best.e.name}: <b className="num">{fmtWeight(Math.round(best.r!.value * 10) / 10)} kg</b> <span className="muted">geschätztes 1RM</span>
              </p>
            )}
            <div>
              <span className="label">Übungen</span>
              <ul className="list">
                {related.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <Link to={`/uebungen/${e.id}`} className="listRow">
                      <ExerciseImage exercise={e} size="thumb" decorative />
                      <span className="spacer">{e.name}</span>
                      <span className="muted small">{e.primary.includes(selected) ? 'primär' : 'sekundär'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
      <p className="notice">
        Die Farben stammen aus deinen protokollierten Arbeitssätzen (primär beteiligter Muskel 1 Satz, sekundär 0,5) und sind keine Messung der
        Regeneration. Die Schwellen ({LOAD_THRESHOLDS.low}, {LOAD_THRESHOLDS.okMax} und {LOAD_THRESHOLDS.highMax} Sätze pro Woche) sind eine
        Arbeitsannahme, keine medizinische Aussage.
      </p>
    </Page>
  );
}
