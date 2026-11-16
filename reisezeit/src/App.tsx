import { Suspense, lazy, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Plane } from 'lucide-react';
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

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header no-print">
      <div className="wrap stack" style={{ ['--gap' as string]: '14px' }}>
        <div className="row between" style={{ ['--gap' as string]: '12px' }}>
          <Link to="/" className="brand">
            <span className="brand-logo"><Plane size={24} aria-hidden="true" /></span>
            <span className="stack" style={{ ['--gap' as string]: '0' }}>
              <span className="brand-name">{t.appName}</span>
              <span className="small mute">{t.tagline}</span>
            </span>
          </Link>
          <Link to="/planer" className="btn btn-primary btn-small">{t.planTrip}</Link>
        </div>
        {children}
      </div>
    </header>
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
