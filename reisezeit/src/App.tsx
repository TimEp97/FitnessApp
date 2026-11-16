import { Suspense, lazy, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Globe2, Map as MapIcon, Plane, Route as RouteIcon } from 'lucide-react';
import { useTrip } from './store/tripStore';
import { t } from './i18n/de';
import { HomePage } from './pages/HomePage';
import { CountryPage } from './pages/CountryPage';
import { ImpressumPage, DatenschutzPage } from './pages/LegalPages';

// Planer und Druckansicht (inkl. Leaflet) erst bei Bedarf nachladen
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const PrintPage = lazy(() => import('./pages/PrintPage'));
const SharedPlanPage = lazy(() => import('./pages/SharedPlanPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Hauptnavigation: Desktop im Kopf, Handy als Tab-Leiste unten */
function useNavItems() {
  const stops = useTrip((s) => s.stops.length);
  return [
    { to: '/', label: 'Länder', icon: Globe2, end: true },
    { to: '/planer', label: 'Reise planen', icon: RouteIcon },
    { to: '/planer?schritt=4', label: stops ? `Mein Plan (${stops})` : 'Mein Plan', short: 'Mein Plan', icon: MapIcon, badge: stops },
  ];
}

function isActive(to: string, pathname: string, search: string) {
  if (to === '/') return pathname === '/' || pathname.startsWith('/land');
  if (to === '/planer') return pathname === '/planer' && !search.includes('schritt=4');
  return pathname === '/planer' && search.includes('schritt=4');
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const items = useNavItems();
  const { pathname, search } = useLocation();
  return (
    <header className="site-header no-print">
      <div className="wrap stack header-inner" style={{ ['--gap' as string]: '14px' }}>
        <div className="row between header-top" style={{ ['--gap' as string]: '12px' }}>
          <Link to="/" className="brand">
            <span className="brand-logo"><Plane size={24} aria-hidden="true" /></span>
            <span className="stack" style={{ ['--gap' as string]: '0' }}>
              <span className="brand-name">{t.appName}</span>
              <span className="small mute brand-tagline">{t.tagline}</span>
            </span>
          </Link>
          <nav className="desk-nav" aria-label="Hauptnavigation">
            {items.map((it) => (
              <Link key={it.to} to={it.to} className={`desk-nav-link${isActive(it.to, pathname, search) ? ' active' : ''}`}
                aria-current={isActive(it.to, pathname, search) ? 'page' : undefined}>
                <it.icon size={18} aria-hidden="true" />{it.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </header>
  );
}

/** Tab-Leiste unten, nur auf dem Handy sichtbar */
function MobileTabBar() {
  const items = useNavItems();
  const { pathname, search } = useLocation();
  return (
    <nav className="tabbar no-print" aria-label="Hauptnavigation (mobil)">
      {items.map((it) => {
        const active = isActive(it.to, pathname, search);
        return (
          <Link key={it.to} to={it.to} className={`tab${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className="tab-icon">
              <it.icon size={22} aria-hidden="true" />
              {it.badge ? <span className="tab-badge" aria-hidden="true">{it.badge}</span> : null}
            </span>
            <span>{it.short ?? it.label}{it.badge ? <span className="sr-only"> ({it.badge} Orte)</span> : null}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer no-print">
      <p>{t.footer}{' '}
        <a href="https://www.auswaertiges-amt.de/de/ReiseUndSicherheit" target="_blank" rel="noopener noreferrer">Reise- und Sicherheitshinweise des Auswärtigen Amts</a>
      </p>
      <nav aria-label="Rechtliches">
        <Link to="/impressum">Impressum</Link>
        <Link to="/datenschutz">Datenschutz</Link>
      </nav>
    </footer>
  );
}

function Loading() {
  return <p className="wrap mute" role="status" style={{ padding: 24 }}>Lädt …</p>;
}

export function App() {
  const { pathname } = useLocation();
  const isPrint = pathname === '/plan/druck';
  return (
    <>
      <a className="skip-link no-print" href="#inhalt">Zum Inhalt springen</a>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/land/:id" element={<CountryPage />} />
          <Route path="/planer" element={<PlannerPage />} />
          <Route path="/plan/druck" element={<PrintPage />} />
          <Route path="/plan/:code" element={<SharedPlanPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isPrint && <SiteFooter />}
      {!isPrint && <MobileTabBar />}
    </>
  );
}

function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap" style={{ paddingTop: 24 }}>
        <h1>Seite nicht gefunden</h1>
        <p><Link to="/">Zur Startseite</Link></p>
      </main>
    </>
  );
}
