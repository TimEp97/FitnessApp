import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SiteHeader } from '../App';
import { CountryCard } from '../components/CountryCard';
import { MonthChips } from '../components/MonthChips';
import { countries, places } from '../data';
import { continents, type ClimateCode, type Country } from '../data/schema';
import { RANK, aggregate } from '../domain/climate';
import { LEGEND, MONTHS_FULL, TAG_LABEL, t } from '../i18n/de';

type ContFilter = 'Alle' | Country['continent'];

/** Suchtext je Land: Name, Gruppe, Regionen, Tipps, Tags und Orte */
const haystack = new Map(
  countries.map((c) => [
    c.id,
    [
      c.name, c.group, c.continent, c.intro,
      ...c.regions.flatMap((r) => [r.name, r.note]),
      ...c.tags.map((tag) => TAG_LABEL[tag]),
      ...places.filter((p) => p.countryId === c.id).flatMap((p) => [p.name, p.tip]),
    ].join(' ').toLowerCase(),
  ]),
);

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const month = clampMonth(Number(params.get('monat')) - 1);
  const cont = (continents as readonly string[]).includes(params.get('kontinent') ?? '') ? (params.get('kontinent') as ContFilter) : 'Alle';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(q);

  // Ab 300 ms Tipp-Pause filtern
  useEffect(() => {
    const id = setTimeout(() => setQuery(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const cards = useMemo(() => {
    const ql = query.trim().toLowerCase();
    const list = countries
      .filter((c) => cont === 'Alle' || c.continent === cont)
      .filter((c) => !ql || haystack.get(c.id)!.includes(ql))
      .map((c) => ({ c, code: month >= 0 ? (aggregate(c.regions.map((r) => r.climate))[month] as ClimateCode) : null }))
      .filter(({ code }) => month < 0 || code === 'G' || code === 'L');
    if (month >= 0) list.sort((a, b) => RANK[b.code!] - RANK[a.code!]);
    return list.map((x) => x.c);
  }, [query, cont, month]);

  const countText =
    month >= 0
      ? `${cards.length} ${cards.length === 1 ? 'Land' : 'Länder'} mit guter Reisezeit im ${MONTHS_FULL[month]}`
      : `${cards.length} ${cards.length === 1 ? 'Land' : 'Länder'}`;

  return (
    <>
      <SiteHeader>
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <label htmlFor="suche" className="label">{t.searchLabel}</label>
          <div className="search">
            <Search size={20} color="var(--mute)" aria-hidden="true" />
            <input
              id="suche"
              type="search"
              value={q}
              placeholder={t.searchPlaceholder}
              onChange={(e) => {
                setQ(e.target.value);
              }}
              onBlur={() => update({ q: q.trim() || null })}
            />
          </div>
        </div>
        <div className="row" style={{ ['--gap' as string]: '8px' }} role="group" aria-label="Kontinent">
          {(['Alle', ...continents] as ContFilter[]).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={c === cont} onClick={() => update({ kontinent: c === 'Alle' ? null : c })}>
              {c}
            </button>
          ))}
        </div>
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <span className="label" id="monat-label">{t.whenTravel}</span>
          <MonthChips allowAny scroll value={month} label={t.whenTravel} onChange={(m) => update({ monat: m >= 0 ? String(m + 1) : null })} />
        </div>
        <div className="legend" aria-label="Legende">
          {LEGEND.map((l) => (
            <span key={l.code}><i className={l.code} aria-hidden="true" />{l.text}</span>
          ))}
        </div>
      </SiteHeader>

      <main id="inhalt" className="wrap stack" style={{ ['--gap' as string]: '14px', paddingTop: 20 }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink-2)' }} aria-live="polite">{countText}</p>
        {cards.length ? (
          <div className="grid-cards">
            {cards.map((c) => (
              <CountryCard key={c.id} country={c} month={month} />
            ))}
          </div>
        ) : (
          <div className="panel" style={{ padding: 28, textAlign: 'center', color: 'var(--mute)' }}>{t.noResults}</div>
        )}
      </main>
    </>
  );
}

export function clampMonth(m: number): number {
  return Number.isInteger(m) && m >= 0 && m <= 11 ? m : -1;
}
