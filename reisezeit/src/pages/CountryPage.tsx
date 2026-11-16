import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { SiteHeader } from '../App';
import { TAG_ICON } from '../components/icons';
import { RegionCard } from '../components/RegionCard';
import { countryById, places } from '../data';
import { citiesOfRegion } from '../domain/cities';
import { useTrip } from '../store/tripStore';
import { aggregate, badMonths, ranges } from '../domain/climate';
import { TAG_LABEL, t } from '../i18n/de';
import { clampMonth } from './HomePage';

export function CountryPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const month = clampMonth(Number(params.get('monat')) - 1);
  const country = countryById.get(id);
  // gewählter Monat je Region; global gewählter Monat ist vorausgewählt
  const [cells, setCells] = useState<Record<string, number>>({});
  const stops = useTrip((s) => s.stops);
  const addStop = useTrip((s) => s.addStop);
  const [added, setAdded] = useState('');
  const inRoute = new Set(stops.map((s) => s.placeId));

  if (!country) {
    return (
      <>
        <SiteHeader />
        <main id="inhalt" className="wrap" style={{ paddingTop: 24 }}>
          <h1>Land nicht gefunden</h1>
          <p><Link to="/">{t.allCountries}</Link></p>
        </main>
      </>
    );
  }

  const codes = country.regions.map((r) => r.climate);
  const agg = aggregate(codes);
  const back = `/${month >= 0 ? `?monat=${month + 1}` : ''}`;
  const hasPlaces = places.some((p) => p.countryId === country.id);
  const planHref = `/planer?reg=${country.id}${month >= 0 ? `&monat=${month + 1}` : ''}`;

  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap stack country-main" style={{ ['--gap' as string]: '18px', paddingTop: 16 }}>
        <Link to={back} className="chip" style={{ alignSelf: 'flex-start' }}>
          <ChevronLeft size={18} aria-hidden="true" />{t.allCountries}
        </Link>

        <section className="card hero hero-split">
          <img src={`img/scenes/${country.scene}.svg`} alt="" />
          <div className="body">
            <div className="row" style={{ ['--gap' as string]: '10px' }}>
              <span className="code-badge" style={{ fontSize: 12 }}>{country.id.toUpperCase()}</span>
              <h1 style={{ fontSize: 32 }}>{country.name}</h1>
              <span className="mute small">{country.continent} · {country.group}</span>
            </div>
            <p style={{ margin: 0, fontSize: 16 }} className="prose">{country.intro}</p>
            <div className="row">
              <Link to={planHref} className="btn btn-primary">{t.planHere}</Link>
              {!hasPlaces && <span className="small mute">Für {country.name} gibt es noch keine Orte im Planer – du kannst trotzdem planen.</span>}
            </div>
            <div className="row" style={{ ['--gap' as string]: '8px' }}>
              {country.tags.map((tag) => {
                const Icon = TAG_ICON[tag];
                return <span key={tag} className="tag" style={{ fontSize: 13, padding: '6px 12px' }}><Icon size={16} aria-hidden="true" />{TAG_LABEL[tag]}</span>;
              })}
            </div>
            <div className="facts">
              <div><div className="label" style={{ fontSize: 12 }}>Beste Zeit (insgesamt)</div><strong>{ranges(agg, 'G')}</strong></div>
              <div><div className="label" style={{ fontSize: 12 }}>Gut &amp; ruhiger</div><strong>{ranges(agg, 'L')}</strong></div>
              <div><div className="label" style={{ fontSize: 12 }}>Eher meiden</div><strong>{badMonths(codes)}</strong></div>
            </div>
          </div>
        </section>

        <h2 style={{ fontSize: 20, marginTop: 6 }}>{t.regionsHeading}</h2>
        <p className="small mute" style={{ margin: '-8px 0 0' }}>
          Orte mit <strong>+</strong> kannst du direkt in deine Route übernehmen.
        </p>
        <p className="sr-only" role="status" aria-live="polite">{added}</p>
        <div className="region-grid">
        {country.regions.map((r) => (
          <RegionCard key={r.id} region={r} selected={cells[r.id] ?? month} onSelect={(m) => setCells((s) => ({ ...s, [r.id]: m }))}
            cities={citiesOfRegion(r, places)} inRoute={inRoute}
            onAddPlace={(id) => {
              addStop(id);
              setAdded(`${places.find((p) => p.id === id)?.name} zur Route hinzugefügt.`);
            }} />
        ))}
        </div>
        {stops.length > 0 && (
          <Link to="/planer?schritt=2" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
            Zur Route ({stops.length} {stops.length === 1 ? 'Ort' : 'Orte'})
          </Link>
        )}
      </main>
    </>
  );
}
