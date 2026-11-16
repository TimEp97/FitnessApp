import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Bus, ChevronRight, FileDown, Info, Link2, MapPin, RotateCcw, Send, SlidersHorizontal, Sparkles } from 'lucide-react';
import { isoOfAppCountry } from '../data/world';
import { useProfile } from '../store/profileStore';
import { SiteHeader } from '../App';
import { InterestTiles } from '../components/InterestTiles';
import { LegCard } from '../components/LegCard';
import { ChipGroup, MonthChips } from '../components/MonthChips';
import { PlanView } from '../components/PlanView';
import { Stepper } from '../components/Stepper';
import { PlaceAdder, StopList } from '../components/StopList';
import { SuggestionCard } from '../components/SuggestionCard';
import { countryById, ctx } from '../data';
import { areaOfCountry } from '../domain/ctx';
import { buildRoute } from '../domain/route';
import { suggest } from '../domain/suggest';
import { routeTitle } from '../domain/timeline';
import type { RegionFilter, Scored } from '../domain/types';
import { MONTHS_FULL } from '../i18n/de';
import { copyText, sendPlan, shareUrl } from '../share';
import { useInputs, usePlan } from '../store/selectors';
import { useTrip } from '../store/tripStore';
import { clampMonth } from './HomePage';

const PLANNER_REGIONS: { value: RegionFilter; label: string }[] = [
  { value: 'Alle', label: 'Überall' },
  { value: 'Südostasien', label: 'Südostasien' },
  { value: 'Südamerika', label: 'Südamerika' },
  { value: 'Europa', label: 'Europa' },
];

export default function PlannerPage() {
  const [params, setParams] = useSearchParams();
  const step = Math.min(4, Math.max(1, Number(params.get('schritt')) || 1));
  const prefCountry = params.get('reg') ?? undefined;
  const trip = useTrip();
  const inputs = useInputs();
  const plan = usePlan();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [showAll, setShowAll] = useState(false);
  // Vorschlagsliste: auf dem Desktop sichtbar, auf dem Handy erst auf Wunsch
  const [showSugg, setShowSugg] = useState(() => typeof matchMedia === 'function' && matchMedia('(min-width: 1024px)').matches);
  const profile = useProfile();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Aus dem Länderdetail: Monat und Region vorwählen (einmalig)
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const m = clampMonth(Number(params.get('monat')) - 1);
    const c = prefCountry ? countryById.get(prefCountry) : undefined;
    const patch: Parameters<typeof trip.setInput>[0] = {};
    if (m >= 0) patch.month = m;
    if (c) {
      const area = areaOfCountry(c);
      patch.region = PLANNER_REGIONS.some((r) => r.value === area) ? (area as RegionFilter) : 'Alle';
    }
    if (Object.keys(patch).length) trip.setInput(patch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goStep = (n: number) => {
    const next = new URLSearchParams(params);
    next.set('schritt', String(n));
    next.delete('monat');
    setParams(next);
    setStatus('');
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const sugg = useMemo(() => {
    const r = suggest(inputs, ctx);
    if (!prefCountry) return r;
    // Orte im gewählten Land nach vorne holen (Reihenfolge sonst unverändert)
    const first: Scored[] = [];
    const rest: Scored[] = [];
    for (const s of r.ranked) (s.place.countryId === prefCountry ? first : rest).push(s);
    return { ...r, ranked: [...first, ...rest] };
  }, [inputs, prefCountry]);

  const prefName = prefCountry ? countryById.get(prefCountry)?.name : undefined;
  const prefHasPlaces = prefCountry ? ctx.places.some((p) => p.countryId === prefCountry) : true;
  const chosenIds = new Set(trip.stops.map((s) => s.placeId));
  const visible = showAll ? sugg.ranked : sugg.ranked.slice(0, 12);

  function autoRoute() {
    if (!sugg.ranked.length) {
      setStatus('Keine passenden Orte – ändere Monat, Region oder Vorlieben.');
      return;
    }
    trip.applyRoute(buildRoute(sugg.ranked, sugg.inputs, ctx));
    goStep(4);
  }

  const shared = { month: trip.month, days: Math.max(plan.totalDays, 1), stops: trip.stops, legChoice: trip.legChoice };
  const title = routeTitle(plan.places);
  const subtitle = [plan.countries.join(', '), MONTHS_FULL[trip.month], `${plan.totalDays} Tage`].filter(Boolean).join(' · ');
  const hasPlan = trip.stops.length > 0;

  const planIso = [...new Set(plan.places.flatMap((p) => isoOfAppCountry(p.countryId)))];
  const allVisited = hasPlan && planIso.every((c) => profile.countries.includes(c)) && plan.places.every((p) => profile.places.includes(p.id));
  const markVisited = () => {
    profile.addCountries(planIso);
    profile.addPlaces(plan.places.map((p) => p.id));
    setStatus('Im Reiseprofil eingetragen – die Punkte sind gutgeschrieben.');
  };

  return (
    <>
      <SiteHeader>
        <Stepper step={step} hasPlan={hasPlan} onPick={goStep} />
      </SiteHeader>
      <main id="inhalt" className="wrap stack planner-main" style={{ ['--gap' as string]: '18px', paddingTop: 20 }}>
        <p className="sr-only" role="status" aria-live="polite">{status}</p>

        {step === 1 && (
          <section className="stack" style={{ ['--gap' as string]: '18px' }} aria-labelledby="h-step">
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <h1 id="h-step" ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Deine Reise in drei Fragen</h1>
              <p className="mute" style={{ margin: 0 }}>
                Sag uns, wann, wie lange und was dir wichtig ist. Den Reiseplan mit Route, Karte und PDF erstellen wir automatisch.
              </p>
            </div>
            {prefName && (
              <div className="notice"><Info size={18} aria-hidden="true" />
                {prefHasPlaces ? `Deine Route beginnt in ${prefName}.` : `Für ${prefName} gibt es noch keine Orte im Planer – wir zeigen dir passende Alternativen.`}
              </div>
            )}
            <div className="planner-two">
              <div className="prefs-col stack" style={{ ['--gap' as string]: '18px' }}>
                <fieldset className="q">
                  <legend>1. Wann willst du reisen?</legend>
                  <MonthChips value={trip.month} onChange={(month) => trip.setInput({ month })} />
                </fieldset>
                <fieldset className="q">
                  <legend>2. Wie lange?</legend>
                  <div className="row" style={{ ['--gap' as string]: '6px' }} role="group" aria-label="Reisedauer">
                    {([[7, '1 Woche'], [10, '10 Tage'], [14, '2 Wochen'], [21, '3 Wochen']] as const).map(([d, label]) => (
                      <button key={d} type="button" className="chip" aria-pressed={trip.days === d} onClick={() => trip.setInput({ days: d })}>{label}</button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="q">
                  <legend>3. Was ist dir wichtig?</legend>
                  <InterestTiles
                    selected={trip.interests}
                    mustHave={trip.mustHave}
                    onToggle={trip.toggleInterest}
                    onMust={(id) => trip.setInput({ interests: trip.interests.includes(id) ? trip.interests : [...trip.interests, id], mustHave: id })}
                  />
                </fieldset>
                <details className="more">
                  <summary><SlidersHorizontal size={18} aria-hidden="true" />Mehr Einstellungen (optional)</summary>
                  <div className="pref-rows" style={{ marginTop: 12 }}>
                    <ChipGroup label="Wohin ungefähr?" value={trip.region} options={PLANNER_REGIONS} onChange={(region) => trip.setInput({ region })} />
                    <ChipGroup label="Tempo" value={trip.pace} onChange={(pace) => trip.setInput({ pace })}
                      options={[{ value: 'slow', label: 'Entspannt' }, { value: 'mid', label: 'Ausgewogen' }, { value: 'fast', label: 'Viel sehen' }]} />
                    <ChipGroup label="Reisestil" value={trip.style} onChange={(style) => trip.setInput({ style })}
                      options={[{ value: 'budget', label: 'Budget' }, { value: 'komfort', label: 'Komfort' }, { value: 'luxus', label: 'Luxus' }]} />
                    <ChipGroup label="Wer reist mit?" value={trip.party} onChange={(party) => trip.setInput({ party })}
                      options={[{ value: 'solo', label: 'Allein' }, { value: 'paar', label: 'Zu zweit' }, { value: 'familie', label: 'Familie' }, { value: 'freunde', label: 'Freunde' }]} />
                    <fieldset className="stack" style={{ ['--gap' as string]: '6px', border: 0, padding: 0, margin: 0 }}>
                      <legend className="label" style={{ marginBottom: 6 }}>Lieber nicht</legend>
                      {([
                        ['noLongHaul', 'Keine Langstrecke (über 8 h Flug)'],
                        ['noHeat', 'Keine Hitze über 35 °C'],
                        ['noMalaria', 'Keine Malaria-Gebiete'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="row" style={{ ['--gap' as string]: '8px', minHeight: 32, cursor: 'pointer' }}>
                          <input type="checkbox" checked={trip.exclusions[key]} style={{ width: 20, height: 20 }}
                            onChange={(e) => trip.setInput({ exclusions: { ...trip.exclusions, [key]: e.target.checked } })} />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                  </div>
                </details>
                <div className="cta-bar sugg-actions">
                  <button type="button" className="btn btn-primary cta" onClick={autoRoute} disabled={!sugg.ranked.length}>
                    <Sparkles size={20} aria-hidden="true" />Reiseplan erstellen
                  </button>
                </div>
                <span className="small mute" aria-live="polite">
                  {sugg.ranked.length} passende {sugg.ranked.length === 1 ? 'Ort' : 'Orte'} im {MONTHS_FULL[trip.month]}
                  {!trip.interests.length && ' – wähle Vorlieben für bessere Treffer'}
                </span>
              </div>

              <div className="sugg-col stack" style={{ ['--gap' as string]: '16px' }}>
                {sugg.relaxed.map((r) => (
                  <div key={r.kind} className="notice"><Info size={18} aria-hidden="true" />{r.text}</div>
                ))}
                <div className="row between sugg-head" style={{ alignItems: 'flex-end' }}>
                  <div className="stack" style={{ ['--gap' as string]: '2px' }}>
                    <h2 style={{ fontSize: 22 }}>Das passt zu dir</h2>
                    <span className="mute small">Aus diesen Orten bauen wir deine Route.</span>
                  </div>
                  <div className="row">
                    <button type="button" className="btn btn-secondary btn-small" aria-expanded={showSugg} onClick={() => setShowSugg((v) => !v)}>
                      {showSugg ? 'Vorschläge ausblenden' : `Vorschläge ansehen (${sugg.ranked.length})`}
                    </button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => goStep(2)}>Selbst zusammenstellen</button>
                  </div>
                </div>
                {showSugg && (sugg.ranked.length ? (
                  <div className="sugg-grid">
                    {visible.map((s) => (
                      <SuggestionCard key={s.place.id} s={s} month={trip.month} style={trip.style} wanted={trip.interests}
                        added={chosenIds.has(s.place.id)}
                        onAdd={() => {
                          if (chosenIds.has(s.place.id)) trip.removeStop(trip.stops.findIndex((x) => x.placeId === s.place.id));
                          else trip.addStop(s.place.id);
                        }} />
                    ))}
                  </div>
                ) : (
                  <div className="empty">Im {MONTHS_FULL[trip.month]} passt hier nichts. Probier einen anderen Monat oder weniger Ausschlüsse.</div>
                ))}
                {showSugg && !showAll && sugg.ranked.length > visible.length && (
                  <button type="button" className="btn btn-secondary" style={{ alignSelf: 'center' }} onClick={() => setShowAll(true)}>
                    Alle {sugg.ranked.length} Vorschläge zeigen
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="stack" style={{ ['--gap' as string]: '18px' }}>
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Orte anpassen</h1>
              <p className="mute" style={{ margin: 0 }}>Reihenfolge, Nächte und Orte ändern. Die Farbe zeigt das Wetter im gewählten Monat.</p>
            </div>
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <span className="label">Reisemonat</span>
              <MonthChips scroll value={trip.month} onChange={(month) => trip.setInput({ month })} />
            </div>
            <div className="split">
              <StopList stops={trip.stops} month={trip.month} onNights={trip.setNights} onMove={trip.moveStop} onRemove={trip.removeStop} />
              <PlaceAdder stops={trip.stops} month={trip.month} onAdd={trip.addStop} />
            </div>
            <div className="row between step-actions">
              <button type="button" className="btn btn-secondary" onClick={() => goStep(3)} disabled={trip.stops.length < 2}>Verkehrsmittel</button>
              <button type="button" className="btn btn-primary" onClick={() => goStep(4)} disabled={!trip.stops.length}>
                Zum Reiseplan<ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Verkehrsmittel anpassen</h1>
              <p className="mute" style={{ margin: 0 }}>Für jede Strecke ist schon das passende Verkehrsmittel gewählt. Ein Tipp genügt zum Ändern. Alle Zeiten sind grobe Schätzungen.</p>
            </div>
            {plan.legs.length ? (
              plan.legs.map((l) => <LegCard key={l.key} leg={l} onPick={(kind) => trip.setLeg(l.key, kind)} />)
            ) : (
              <div className="empty">Für Verbindungen brauchst du mindestens zwei Orte.</div>
            )}
            <div className="row between step-actions">
              <button type="button" className="btn btn-secondary" onClick={() => goStep(2)}>Orte</button>
              <button type="button" className="btn btn-primary" onClick={() => goStep(4)} disabled={!trip.stops.length}>
                Zum Reiseplan<ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="stack" style={{ ['--gap' as string]: '4px' }}>
                <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Dein Reiseplan</h1>
                <span className="mute">{hasPlan ? `${title} · ${subtitle}` : 'Noch kein Reiseplan'}</span>
              </div>
              {hasPlan && (
                <div className="row plan-actions">
                  <button aria-label="Link kopieren" type="button" className="btn btn-secondary" onClick={async () => {
                    const ok = await copyText(shareUrl(shared));
                    setStatus(ok ? 'Link kopiert.' : 'Kopieren nicht möglich – bitte den Link aus der Adresszeile nehmen.');
                  }}><Link2 size={18} aria-hidden="true" /><span className="only-desk">Link kopieren</span><span className="only-mob">Link</span></button>
                  <button type="button" className="btn btn-secondary" onClick={() => sendPlan(`Reiseplan: ${title}`, subtitle, shareUrl(shared))}>
                    <Send size={18} aria-hidden="true" />Senden
                  </button>
                  <Link aria-label="PDF herunterladen" to="/plan/druck?auto=1" className="btn btn-primary"><FileDown size={18} aria-hidden="true" /><span className="only-desk">PDF herunterladen</span><span className="only-mob">PDF</span></Link>
                </div>
              )}
            </div>
            {status && <div className="notice" aria-hidden="true">{status}</div>}
            {hasPlan ? (
              <>
                <div className="row adjust" role="group" aria-label="Reiseplan anpassen">
                  <span className="label">Anpassen:</span>
                  <button type="button" className="chip" onClick={() => goStep(2)}><MapPin size={16} aria-hidden="true" />Orte</button>
                  <button type="button" className="chip" onClick={() => goStep(3)} disabled={plan.legs.length === 0}><Bus size={16} aria-hidden="true" />Verkehrsmittel</button>
                  <button type="button" className="chip" onClick={() => goStep(1)}><SlidersHorizontal size={16} aria-hidden="true" />Wünsche</button>
                  <button type="button" className={`chip${allVisited ? ' used' : ''}`} disabled={allVisited} onClick={markVisited}>
                    <BadgeCheck size={16} aria-hidden="true" />{allVisited ? 'Im Profil eingetragen' : 'Reise gemacht? Im Profil eintragen'}
                  </button>
                </div>
                <PlanView plan={plan} month={trip.month} style={trip.style} />
              </>
            ) : (
              <div className="empty">Beantworte zuerst die drei Fragen – dann entsteht dein Reiseplan automatisch.{' '}
                <button type="button" className="btn btn-primary btn-small" onClick={() => goStep(1)}>Los geht’s</button>
              </div>
            )}
            <div className="row between step-actions">
              <button aria-label="Neu anfangen" type="button" className="btn btn-secondary" onClick={() => {
                if (confirm('Reiseplan und Vorlieben löschen und neu anfangen?')) {
                  trip.reset();
                  navigate('/planer?schritt=1');
                }
              }}><RotateCcw size={18} aria-hidden="true" /><span className="only-desk">Neu anfangen</span><span className="only-mob">Neu</span></button>
              {hasPlan && (
                <Link to="/plan/druck?auto=1" className="btn btn-primary only-mob-flex"><FileDown size={18} aria-hidden="true" />PDF herunterladen</Link>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
