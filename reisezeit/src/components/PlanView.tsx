import { Suspense, lazy, useState } from 'react';
import { AlertTriangle, Map as MapIcon } from 'lucide-react';
import { MAP_CONSENT_KEY } from '../config';
import type { Plan } from '../domain/timeline';
import { formatHours } from '../domain/transport';
import { MapLegend, TripMapStatic } from './TripMapStatic';
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
export function PlanView({ plan, month }: { plan: Plan; month: number }) {
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
          <Timeline plan={plan} month={month} />
        </div>
      </div>
    </div>
  );
}
