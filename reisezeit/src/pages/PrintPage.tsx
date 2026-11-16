import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BedDouble, ChevronLeft, FileDown, Plane, Printer } from 'lucide-react';
import { planStats } from '../components/PlanView';
import { TripMapStatic, loadLand } from '../components/TripMapStatic';
import { TRANSPORT_ICON } from '../components/icons';
import { ctx } from '../data';
import { AA_URL, COUNTRY_INFO, INFO_STAND, VISA_LABEL } from '../data/countryInfo';
import { routeTitle, dayLabel, nightsLabel, type TimelineItem } from '../domain/timeline';
import { formatHours } from '../domain/transport';
import { CODE_LABEL, MONTHS_FULL, t } from '../i18n/de';
import { countryImage, placeImage, type ImageRef } from '../images';
import { usePlan } from '../store/selectors';
import { useTrip } from '../store/tripStore';

const chunk = <T,>(list: T[], n: number): T[][] => list.reduce<T[][]>((acc, x, i) => (i % n ? acc[acc.length - 1].push(x) : acc.push([x]), acc), []);

/**
 * Rendert jede A4-Seite als Bild (der Browser zeichnet selbst, daher originalgetreu) und speichert
 * alles als eine PDF-Datei. Die Bibliotheken werden erst beim Klick geladen.
 */
async function downloadPdf(root: HTMLElement, filename: string) {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  await Promise.all([document.fonts?.ready, loadLand().catch(() => null)]);
  await Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => null))));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const sheets = [...root.querySelectorAll<HTMLElement>('.sheet')];
  const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false, style: { margin: '0', boxShadow: 'none' } };
  // Safari lädt eingebettete Bilder und Schriften erst beim zweiten Durchlauf zuverlässig
  await toCanvas(sheets[0], opts).catch(() => null);
  for (let i = 0; i < sheets.length; i++) {
    const canvas = await toCanvas(sheets[i], opts);
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297);
  }
  const url = URL.createObjectURL(pdf.output('blob'));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function Footer({ page, pages }: { page: number; pages: number }) {
  return (
    <footer className="sheet-foot">
      <span>{t.estimateNote}</span>
      <span>{t.appName} · Seite {page} von {pages}</span>
    </footer>
  );
}

/** Reiseplan als mehrseitiges A4-Dokument mit Bildern – zum Herunterladen oder Drucken */
export default function PrintPage() {
  const plan = usePlan();
  const month = useTrip((s) => s.month);
  const style = useTrip((s) => s.style);
  const [params, setParams] = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const title = routeTitle(plan.places);
  const subtitle = [plan.countries.join(', '), MONTHS_FULL[month], `${plan.totalDays} Tage`].join(' · ');
  // Dateiname ohne Umlaute und Sonderzeichen, damit er auf jedem Gerät erhalten bleibt
  const filename = `Reiseplan_${plan.countries.join('_')}_${MONTHS_FULL[month]}`
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-');

  const download = useCallback(async () => {
    if (!rootRef.current) return;
    setState('busy');
    try {
      await downloadPdf(rootRef.current, `${filename}.pdf`);
      setState('done');
    } catch {
      setState('error');
    }
  }, [filename]);

  useEffect(() => {
    const prev = document.title;
    document.title = filename; // Dateiname-Vorschlag im Druckdialog
    return () => { document.title = prev; };
  }, [filename]);

  // „PDF herunterladen“ im Reiseplan führt mit ?auto=1 hierher: Download startet von selbst
  const started = useRef(false);
  useEffect(() => {
    if (params.get('auto') !== '1' || started.current || !plan.places.length) return;
    started.current = true;
    setParams({}, { replace: true });
    void download();
  }, [params, setParams, download, plan.places.length]);

  if (!plan.places.length) {
    return (
      <main id="inhalt" className="wrap" style={{ paddingTop: 24 }}>
        <h1>Noch kein Reiseplan</h1>
        <p><Link to="/planer">Zum Reiseplaner</Link></p>
      </main>
    );
  }

  const stops = plan.items.filter((it): it is Extract<TimelineItem, { type: 'stop' }> => it.type === 'stop');
  const countries = [...new Map(plan.places.map((p) => [p.countryId, ctx.country(p)])).values()];
  const stopPages = chunk(stops, 3);
  const countryPages = chunk(countries, 2);
  const pages = 2 + stopPages.length + countryPages.length;
  const cover = countryImage(countries[0]);
  const used: ImageRef[] = [cover, ...stops.map((s) => placeImage(s.place, ctx.country(s.place))), ...countries.map(countryImage)];
  const credits = [...new Map(used.filter((u) => u.credit).map((u) => [u.credit!.file, u.credit!])).values()];
  let page = 0;

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <Link to="/planer?schritt=4" className="btn btn-secondary btn-small"><ChevronLeft size={18} aria-hidden="true" />Zurück zum Plan</Link>
        <button type="button" className="btn btn-primary btn-small" onClick={download} disabled={state === 'busy'}>
          <FileDown size={18} aria-hidden="true" />{state === 'busy' ? 'PDF wird erstellt …' : 'PDF herunterladen'}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />Drucken
        </button>
        <span className="small" role="status" aria-live="polite">
          {state === 'busy' && 'Einen Moment – dein Reiseplan wird als PDF erstellt.'}
          {state === 'done' && `Fertig: ${filename}.pdf liegt in deinen Downloads.`}
          {state === 'error' && 'Das hat nicht geklappt. Nimm „Drucken“ und wähle dort „Als PDF speichern“.'}
        </span>
      </div>

      <div ref={rootRef} id="inhalt">
        {/* Seite 1: Titel mit Länderbild, Kennzahlen, Karte */}
        <section className="sheet">
          <header className="sheet-cover">
            <img src={cover.src} alt="" />
            <div className="sheet-cover-text">
              <span className="sheet-kicker">Reiseplan</span>
              <h1>{title}</h1>
              <span>{subtitle}</span>
            </div>
            <div className="sheet-brand"><Plane size={20} aria-hidden="true" />{t.appName}</div>
          </header>
          <div className="sheet-stats">
            {planStats(plan).map((s) => (
              <div key={s.k}><div className="label" style={{ fontSize: 12 }}>{s.k}</div><div className="v">{s.v}</div></div>
            ))}
          </div>
          <div className="sheet-map"><TripMapStatic plan={plan} height="100%" width={800} ratio={118 / 178} /></div>
          <ol className="sheet-route">
            {stops.map((s) => (
              <li key={s.index}><span className="num-badge">{s.index + 1}</span><span><strong>{s.place.name}</strong><br />{nightsLabel(s.nights)}</span></li>
            ))}
          </ol>
          <Footer page={++page} pages={pages} />
        </section>

        {/* Seite 2: Tagesplan */}
        <section className="sheet">
          <div className="sheet-table">
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
                  return <tr key={k}><td><strong>Tag {it.day}</strong></td><td>Rückreise ab {it.place.name}</td><td /><td /></tr>;
                })}
              </tbody>
            </table>
            {plan.warnings.length > 0 && <ul className="sheet-warn">{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          </div>
          <Footer page={++page} pages={pages} />
        </section>

        {/* Stopps mit Bild */}
        {stopPages.map((group, gi) => (
          <section className="sheet" key={`s${gi}`}>
            <div className="sheet-body">
              <h2>Deine Stopps{stopPages.length > 1 ? ` (${gi + 1}/${stopPages.length})` : ''}</h2>
              {group.map((s) => {
                const leg = plan.legs[s.index];
                const LegIcon = leg ? TRANSPORT_ICON[leg.chosen.kind] : null;
                return (
                  <article className="sheet-stop" key={s.index}>
                    <img src={placeImage(s.place, ctx.country(s.place)).src} alt="" />
                    <div className="stack" style={{ ['--gap' as string]: '5px' }}>
                      <span className="sheet-kicker" style={{ color: 'var(--mute)' }}>{dayLabel(s.fromDay, s.toDay)} · {nightsLabel(s.nights)}</span>
                      <h3>{s.index + 1}. {s.place.name}</h3>
                      <span className="mute">{ctx.country(s.place).name} · {ctx.region(s.place).name}</span>
                      <p>{s.place.tip}</p>
                      <p className="sheet-line"><BedDouble size={15} aria-hidden="true" /><span><strong>Schlafen:</strong> {s.place.stays[style]}</span></p>
                      <span className={`pill ${s.code}`}>{MONTHS_FULL[month]}: {CODE_LABEL[s.code]}</span>
                      {leg && LegIcon && (
                        <p className="sheet-line sheet-next"><LegIcon size={15} aria-hidden="true" /><span>Weiter nach {leg.to.name}: {leg.chosen.label}, {formatHours(leg.chosen.hours)}</span></p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <Footer page={++page} pages={pages} />
          </section>
        ))}

        {/* Länder-Infos */}
        {countryPages.map((group, gi) => (
          <section className="sheet" key={`c${gi}`}>
            <div className="sheet-body">
              <h2>Gut zu wissen: Einreise für Deutsche</h2>
              {group.map((c) => {
                const info = COUNTRY_INFO[c.id];
                return (
                  <article className="sheet-country" key={c.id}>
                    <img src={countryImage(c).src} alt="" />
                    <div className="stack" style={{ ['--gap' as string]: '6px' }}>
                      <div className="row between"><h3>{c.name}</h3>{info && <span className={`pill visa-${info.visa}`}>{VISA_LABEL[info.visa]}</span>}</div>
                      <p>{c.intro}</p>
                      {info && (
                        <dl className="sheet-facts">
                          <div><dt>Visum</dt><dd>{info.visaText}</dd></div>
                          <div><dt>Aufenthalt</dt><dd>{info.stay}</dd></div>
                          <div><dt>Reisedokument</dt><dd>{info.doc}</dd></div>
                          <div><dt>Währung</dt><dd>{info.currency}</dd></div>
                          <div><dt>Zeitverschiebung</dt><dd>{info.time}</dd></div>
                          {info.note && <div><dt>Hinweis</dt><dd>{info.note}</dd></div>}
                        </dl>
                      )}
                    </div>
                  </article>
                );
              })}
              {gi === countryPages.length - 1 && (
                <div className="sheet-small">
                  <p>Einreise-Infos: Kurzfassung für deutsche Staatsangehörige, Stand {INFO_STAND}, ohne Gewähr. Verbindlich: {AA_URL.replace('https://', '')}</p>
                  {credits.length > 0 && (
                    <p><strong>Bildnachweise:</strong> {credits.map((c) => `${c.title ?? c.file} – ${c.author}, ${c.license}`).join(' · ')} (Wikimedia Commons)</p>
                  )}
                </div>
              )}
            </div>
            <Footer page={++page} pages={pages} />
          </section>
        ))}
      </div>
    </div>
  );
}
