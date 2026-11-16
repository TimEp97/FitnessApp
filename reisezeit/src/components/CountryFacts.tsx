import { Banknote, Clock, FileCheck2, IdCard, Info, TimerReset } from 'lucide-react';
import { AA_URL, COUNTRY_INFO, INFO_STAND, VISA_LABEL } from '../data/countryInfo';

/** Einreise-Infos für Deutsche: Visum, Aufenthalt, Dokument, Währung, Zeitverschiebung */
export function CountryFacts({ countryId, name, compact }: { countryId: string; name: string; compact?: boolean }) {
  const info = COUNTRY_INFO[countryId];
  if (!info) return null;
  const rows = [
    { icon: FileCheck2, k: 'Visum', v: info.visaText },
    { icon: TimerReset, k: 'Aufenthalt', v: info.stay },
    { icon: IdCard, k: 'Reisedokument', v: info.doc },
    { icon: Banknote, k: 'Währung', v: info.currency },
    { icon: Clock, k: 'Zeitverschiebung', v: info.time },
  ];
  return (
    <section className={`panel facts-card${compact ? ' compact' : ''}`} aria-label={`Einreise und Wichtiges für ${name}`}>
      <div className="row between" style={{ ['--gap' as string]: '8px' }}>
        <h2 style={{ fontSize: compact ? 16 : 20 }}>{compact ? name : 'Einreise & Wichtiges für Deutsche'}</h2>
        <span className={`pill visa-${info.visa}`}>{VISA_LABEL[info.visa]}</span>
      </div>
      <dl className="facts-list">
        {rows.map((r) => (
          <div key={r.k}>
            <dt><r.icon size={16} aria-hidden="true" />{r.k}</dt>
            <dd>{r.v}</dd>
          </div>
        ))}
      </dl>
      {info.note && <p className="facts-note"><Info size={16} aria-hidden="true" />{info.note}</p>}
      {!compact && (
        <p className="tiny mute" style={{ margin: 0 }}>
          Kurzfassung für deutsche Staatsangehörige, Stand {INFO_STAND}, ohne Gewähr. Regeln ändern sich – verbindlich sind die{' '}
          <a href={AA_URL} target="_blank" rel="noopener noreferrer">Reise- und Sicherheitshinweise des Auswärtigen Amts</a>.
        </p>
      )}
    </section>
  );
}
