import { Suspense, lazy, useState } from 'react';
import { AlertTriangle, Map as MapIcon } from 'lucide-react';
import { MAP_CONSENT_KEY } from '../config';
import type { Plan } from '../domain/timeline';
import { formatHours } from '../domain/transport';
import { MapLegend, TripMapStatic } from './TripMapStatic';
import { CountryFacts } from './CountryFacts';
import { ctx } from '../data';
import type { Style } from '../domain/types';
import { Timeline } from './Timeline';

const TripMap = lazy(() => import('./TripMap'));

function readConsent() {
  try { return localStorage.getItem(MAP_CONSENT_KEY) === '1'; } catch { return false; }
}

export function planStats(plan: Plan) {
  return [
    { k: 'Reisedauer', v: `${plan.totalDays} Tage` },
    { k: 'Stopps', v: String(plan.places.length) },
    { k: plan.countries.length === 1 ? 'Land' : 'Länder', v: plan.countries.length === 1 ? plan.countries[0] : String(plan.countries.length) },
    { k: 'Zeit unterwegs', v: plan.legs.length ? formatHours(plan.transitHours) : '–' },
  ];
}

/** Kennzahlen, Warnungen, Karte und Tagesablauf (Schritt 4 und geteilter Plan) */
export function PlanView({ plan, month, style }: { plan: Plan; month: number; style?: Style }) {
  const planCountries = [...new Map(plan.places.map((p) => [p.countryId, ctx.country(p)])).values()];
  const [interactive, setInteractive] = useState(readConsent);
  const loadMap = () => {
    try { localStorage.setItem(MAP_CONSENT_KEY, '1'); } catch { /* egal */ }
    setInteractive(true);
  };

  return (
    <div className="stack" style={{ ['--gap' as string]: '16px' }}>
      <div className="stats">
        {planStats(plan).map((s) => (
          <div key={s.k} className="card stat">
            <div className="label" style={{ fontSize: 12 }}>{s.k}</div>
            <div className="v">{s.v}</div>
          </div>
        ))}
      </div>

      {plan.warnings.map((w) => (
        <div key={w} className="warning" role="note"><AlertTriangle size={20} aria-hidden="true" style={{ flex: '0 0 auto' }} />{w}</div>
      ))}

      <div className="split">
        <div className="card map-box map-sticky" style={{ flex: '1 1 460px' }}>
          {interactive ? (
            <Suspense fallback={<div className="map-placeholder">Karte lädt …</div>}>
              <TripMap plan={plan} />
            </Suspense>
          ) : (
            <div style={{ position: 'relative' }}>
              <TripMapStatic plan={plan} />
              <button type="button" className="btn btn-secondary btn-small" onClick={loadMap}
                style={{ position: 'absolute', right: 10, bottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.15)' }}>
                <MapIcon size={18} aria-hidden="true" />Interaktive Karte laden
              </button>
            </div>
          )}
          <MapLegend />
          {!interactive && (
            <p className="tiny mute" style={{ margin: 0, padding: '0 14px 10px' }}>
              Die interaktive Karte lädt Kacheln von OpenStreetMap (dabei wird deine IP-Adresse übertragen).
            </p>
          )}
        </div>
        <div style={{ flex: '1 1 380px' }}>
          <Timeline plan={plan} month={month} style={style} />
        </div>
      </div>
      <section className="stack" style={{ ['--gap' as string]: '10px' }} aria-labelledby="h-wissen">
        <h2 id="h-wissen" style={{ fontSize: 20 }}>Gut zu wissen: Einreise für Deutsche</h2>
        <div className="facts-grid">
          {planCountries.map((c) => <CountryFacts key={c.id} countryId={c.id} name={c.name} compact />)}
        </div>
        <p className="tiny mute" style={{ margin: 0 }}>Kurzfassung ohne Gewähr – vor der Reise beim Auswärtigen Amt prüfen.</p>
      </section>
    </div>
  );
}
