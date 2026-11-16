import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plane, Printer } from 'lucide-react';
import { planStats } from '../components/PlanView';
import { TripMapStatic } from '../components/TripMapStatic';
import { routeTitle, dayLabel, nightsLabel } from '../domain/timeline';
import { formatHours } from '../domain/transport';
import { CODE_LABEL, MONTHS_FULL, t } from '../i18n/de';
import { usePlan } from '../store/selectors';
import { useTrip } from '../store/tripStore';

/** A4-Druckansicht: „Drucken“ → „Als PDF sichern“ liefert ein Vektor-PDF */
export default function PrintPage() {
  const plan = usePlan();
  const month = useTrip((s) => s.month);
  const title = routeTitle(plan.places);
  const subtitle = [plan.countries.join(', '), MONTHS_FULL[month], `${plan.totalDays} Tage`].join(' · ');

  useEffect(() => {
    const prev = document.title;
    // Dateiname-Vorschlag im Druckdialog, z. B. „Reiseplan_Thailand_März“
    document.title = `Reiseplan_${plan.countries.join('_').replace(/\s+/g, '-')}_${MONTHS_FULL[month]}`;
    return () => { document.title = prev; };
  }, [plan.countries, month]);

  if (!plan.places.length) {
    return (
      <main id="inhalt" className="wrap" style={{ paddingTop: 24 }}>
        <h1>Noch kein Reiseplan</h1>
        <p><Link to="/planer">Zum Reiseplaner</Link></p>
      </main>
    );
  }

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <Link to="/planer?schritt=4" className="btn btn-secondary btn-small"><ChevronLeft size={18} aria-hidden="true" />Zurück zum Plan</Link>
        <button type="button" className="btn btn-primary btn-small" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />Drucken / Als PDF sichern
        </button>
        <span className="small mute">Im Druckdialog „Als PDF speichern“ wählen.</span>
      </div>
      <main id="inhalt" className="sheet">
        <header className="sheet-head">
          <div className="stack" style={{ ['--gap' as string]: '4px' }}>
            <span className="sheet-kicker">Reiseplan</span>
            <h1>{title}</h1>
            <span style={{ fontSize: 14 }}>{subtitle}</span>
          </div>
          <div className="sheet-brand"><Plane size={22} aria-hidden="true" />{t.appName}</div>
        </header>
        <div className="sheet-stats">
          {planStats(plan).map((s) => (
            <div key={s.k}><div className="label" style={{ fontSize: 12 }}>{s.k}</div><div className="v">{s.v}</div></div>
          ))}
        </div>
        <div className="sheet-map"><TripMapStatic plan={plan} height="100%" width={800} ratio={88 / 178} /></div>
        <section className="sheet-table">
          <h2>Tagesplan &amp; Verbindungen</h2>
          <table>
            <thead>
              <tr><th style={{ width: 74 }}>Tage</th><th>Ort / Strecke</th><th>Programm</th><th style={{ width: 110 }}>Wetter</th></tr>
            </thead>
            <tbody>
              {plan.items.map((it, k) => {
                if (it.type === 'stop') {
                  return (
                    <tr key={k}>
                      <td><strong>{dayLabel(it.fromDay, it.toDay)}</strong></td>
                      <td><strong>{it.index + 1}. {it.place.name}</strong><br /><span className="mute">{nightsLabel(it.nights)}</span></td>
                      <td>{it.place.tip}</td>
                      <td><span className={`pill ${it.code}`}>{CODE_LABEL[it.code]}</span></td>
                    </tr>
                  );
                }
                if (it.type === 'leg') {
                  return (
                    <tr key={k}>
                      <td><strong>Tag {it.day}</strong></td>
                      <td>{it.leg.from.name} → {it.leg.to.name}</td>
                      <td>{it.leg.chosen.label} · {formatHours(it.leg.chosen.hours)}</td>
                      <td />
                    </tr>
                  );
                }
                return (
                  <tr key={k}><td><strong>Tag {it.day}</strong></td><td>Rückreise ab {it.place.name}</td><td /><td /></tr>
                );
              })}
            </tbody>
          </table>
        </section>
        {plan.warnings.length > 0 && (
          <ul className="sheet-warn">{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        )}
        <footer className="sheet-foot">
          <span>{t.estimateNote}</span>
          <span>Erstellt mit {t.appName}</span>
        </footer>
      </main>
    </div>
  );
}
