import { Link } from 'react-router-dom';
import type { ClimateCode, Country } from '../data/schema';
import { aggregate, ranges } from '../domain/climate';
import { CODE_LABEL, MONTHS_FULL, TAG_LABEL, t } from '../i18n/de';
import { TAG_ICON } from './icons';
import { MonthBar } from './MonthBar';

export function CountryCard({ country, month }: { country: Country; month: number }) {
  const agg = aggregate(country.regions.map((r) => r.climate));
  const n = country.regions.length;
  const code = month >= 0 ? (agg[month] as ClimateCode) : null;
  const good = month >= 0 ? country.regions.filter((r) => r.climate[month] === 'G' || r.climate[month] === 'L').length : 0;
  const regionsWord = n === 1 ? 'Region' : 'Regionen';
  const href = `/land/${country.id}${month >= 0 ? `?monat=${month + 1}` : ''}`;
  return (
    <Link to={href} className="country-card" aria-label={`${country.name} öffnen`}>
      <img src={`img/scenes/${country.scene}.svg`} alt="" loading="lazy" />
      <div className="body">
        <div className="row" style={{ ['--gap' as string]: '8px' }}>
          <span className="code-badge">{country.id.toUpperCase()}</span>
          <span className="name">{country.name}</span>
        </div>
        <span className="small mute">{country.group} · {n} {regionsWord}</span>
        <MonthBar code={agg} highlight={month >= 0 ? month : undefined} label="Reisezeit über alle Regionen" />
        <span className="small"><strong>{t.bestTime}:</strong> {ranges(agg, 'G')}</span>
        {code && (
          <span className={`pill ${code}`}>
            Im {MONTHS_FULL[month]}: {CODE_LABEL[code]} in {good} von {n} {regionsWord}
          </span>
        )}
        <div className="row" style={{ ['--gap' as string]: '6px' }}>
          {country.tags.map((tag) => {
            const Icon = TAG_ICON[tag];
            return (
              <span key={tag} className="tag"><Icon size={14} aria-hidden="true" />{TAG_LABEL[tag]}</span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
