import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SiteHeader } from '../App';
import { PlanView } from '../components/PlanView';
import { ctx } from '../data';
import { decodePlan } from '../domain/planLink';
import { buildPlan, routeTitle } from '../domain/timeline';
import { MONTHS_FULL } from '../i18n/de';
import { useTrip } from '../store/tripStore';

/** Geteilter Plan (#/plan/:code) – ansehen und in den eigenen Planer übernehmen */
export default function SharedPlanPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const style = useTrip((s) => s.style);
  const loadPlan = useTrip((s) => s.loadPlan);
  const hasOwn = useTrip((s) => s.stops.length > 0);
  const shared = useMemo(() => decodePlan(code, (id) => !!ctx.place(id)), [code]);
  const plan = useMemo(
    () => (shared ? buildPlan(shared.stops, shared.legChoice, style, shared.month, ctx) : null),
    [shared, style],
  );

  if (!shared || !plan) {
    return (
      <>
        <SiteHeader />
        <main id="inhalt" className="wrap" style={{ paddingTop: 24 }}>
          <h1>Dieser Link enthält keinen gültigen Reiseplan</h1>
          <p><Link to="/planer">Eigene Reise planen</Link></p>
        </main>
      </>
    );
  }

  const take = () => {
    if (hasOwn && !confirm('Deinen aktuellen Reiseplan durch diesen ersetzen?')) return;
    loadPlan(shared);
    navigate('/planer?schritt=4');
  };

  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap stack" style={{ ['--gap' as string]: '16px', paddingTop: 20, maxWidth: 1100 }}>
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="stack" style={{ ['--gap' as string]: '4px' }}>
            <span className="label">Geteilter Reiseplan</span>
            <h1 style={{ fontSize: 26 }}>{routeTitle(plan.places)}</h1>
            <span className="mute">{plan.countries.join(', ')} · {MONTHS_FULL[shared.month]} · {plan.totalDays} Tage</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={take}><Download size={18} aria-hidden="true" />In meinen Planer übernehmen</button>
        </div>
        <PlanView plan={plan} month={shared.month} />
      </main>
    </>
  );
}
