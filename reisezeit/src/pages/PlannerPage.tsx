import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, FileDown, Info, Link2, RotateCcw, Send, Sparkles } from 'lucide-react';
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
    goStep(2);
  }

  const shared = { month: trip.month, days: Math.max(plan.totalDays, 1), stops: trip.stops, legChoice: trip.legChoice };
  const title = routeTitle(plan.places);
  const subtitle = [plan.countries.join(', '), MONTHS_FULL[trip.month], `${plan.totalDays} Tage`].filter(Boolean).join(' · ');
  const maxDone = trip.stops.length >= 2 ? 3 : trip.stops.length ? 1 : 0;

  return (
    <>
      <SiteHeader>
        <Stepper step={step} maxDone={maxDone} onPick={goStep} />
      </SiteHeader>
      <main id="inhalt" className="wrap stack" style={{ ['--gap' as string]: '18px', paddingTop: 20, maxWidth: 1100 }}>
        <p className="sr-only" role="status" aria-live="polite">{status}</p>

        {step === 1 && (
          <section className="stack" style={{ ['--gap' as string]: '20px' }} aria-labelledby="h-step">
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <h1 id="h-step" ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Was magst du?</h1>
              <p className="mute" style={{ margin: 0 }}>
                Tippe alles an, was dir auf Reisen wichtig ist. Wir schlagen dir passende Orte vor – mit gutem Wetter in deinem Reisemonat.
              </p>
            </div>
            {prefName && (
              <div className="notice"><Info size={18} aria-hidden="true" />
                {prefHasPlaces ? `Orte in ${prefName} stehen bei den Vorschlägen vorne.` : `Für ${prefName} gibt es noch keine Orte im Planer – wir zeigen dir passende Alternativen.`}
              </div>
            )}
            <InterestTiles
              selected={trip.interests}
              mustHave={trip.mustHave}
              onToggle={trip.toggleInterest}
              onMust={(id) => trip.setInput({ interests: trip.interests.includes(id) ? trip.interests : [...trip.interests, id], mustHave: id })}
            />
            <div className="pref-rows">
              <ChipGroup label="Wohin ungefähr?" value={trip.region} options={PLANNER_REGIONS} onChange={(region) => trip.setInput({ region })} />
              <div className="stack" style={{ ['--gap' as string]: '6px', minWidth: 0 }}>
                <span className="label">Reisemonat</span>
                <MonthChips value={trip.month} onChange={(month) => trip.setInput({ month })} />
              </div>
              <ChipGroup label="Reisedauer" value={trip.days} onChange={(days) => trip.setInput({ days })}
                options={[{ value: 7, label: '1 Woche' }, { value: 10, label: '10 Tage' }, { value: 14, label: '2 Wochen' }, { value: 21, label: '3 Wochen' }]} />
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

            <div className="row between" style={{ alignItems: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 18 }}>
              <div className="stack" style={{ ['--gap' as string]: '2px' }}>
                <h2 style={{ fontSize: 22 }}>Vorschläge für dich</h2>
                <span className="mute small" aria-live="polite">
                  {sugg.ranked.length} passende {sugg.ranked.length === 1 ? 'Ort' : 'Orte'} im {MONTHS_FULL[trip.month]}
                  {!trip.interests.length && ' – wähle Vorlieben für bessere Treffer'}
                </span>
              </div>
              <div className="row">
                <button type="button" className="btn btn-secondary" onClick={() => goStep(2)}>Selbst zusammenstellen</button>
                <button type="button" className="btn btn-primary" onClick={autoRoute}><Sparkles size={18} aria-hidden="true" />Route automatisch vorschlagen</button>
              </div>
            </div>
            {sugg.relaxed.map((r) => (
              <div key={r.kind} className="notice"><Info size={18} aria-hidden="true" />{r.text}</div>
            ))}
            {sugg.ranked.length ? (
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
            )}
            {!showAll && sugg.ranked.length > visible.length && (
              <button type="button" className="btn btn-secondary" style={{ alignSelf: 'center' }} onClick={() => setShowAll(true)}>
                Alle {sugg.ranked.length} Vorschläge zeigen
              </button>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="stack" style={{ ['--gap' as string]: '18px' }}>
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Wohin geht die Reise?</h1>
              <p className="mute" style={{ margin: 0 }}>Wähle Reisemonat und Orte. Die Farbe zeigt dir sofort, wie das Wetter dort im gewählten Monat ist.</p>
            </div>
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <span className="label">Reisemonat</span>
              <MonthChips value={trip.month} onChange={(month) => trip.setInput({ month })} />
            </div>
            <div className="split">
              <StopList stops={trip.stops} month={trip.month} onNights={trip.setNights} onMove={trip.moveStop} onRemove={trip.removeStop} />
              <PlaceAdder stops={trip.stops} month={trip.month} onAdd={trip.addStop} />
            </div>
            <div className="row between">
              <button type="button" className="btn btn-secondary" onClick={() => goStep(1)}>Zurück</button>
              <button type="button" className="btn btn-primary" onClick={() => goStep(3)} disabled={!trip.stops.length}>
                Weiter: Wie reist du?<ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="stack" style={{ ['--gap' as string]: '6px' }}>
              <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Wie kommst du von A nach B?</h1>
              <p className="mute" style={{ margin: 0 }}>Für jede Strecke schlagen wir das passende Verkehrsmittel vor. Ein Tipp genügt zum Ändern. Alle Zeiten sind grobe Schätzungen.</p>
            </div>
            {plan.legs.length ? (
              plan.legs.map((l) => <LegCard key={l.key} leg={l} onPick={(kind) => trip.setLeg(l.key, kind)} />)
            ) : (
              <div className="empty">Für Verbindungen brauchst du mindestens zwei Orte. <button type="button" className="btn btn-secondary btn-small" onClick={() => goStep(2)}>Orte wählen</button></div>
            )}
            <div className="row between">
              <button type="button" className="btn btn-secondary" onClick={() => goStep(2)}>Zurück</button>
              <button type="button" className="btn btn-primary" onClick={() => goStep(4)} disabled={!trip.stops.length}>
                Reiseplan erstellen<ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="stack" style={{ ['--gap' as string]: '4px' }}>
                <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26 }}>Dein Reiseplan</h1>
                <span className="mute">{plan.places.length ? `${title} · ${subtitle}` : 'Noch keine Orte gewählt'}</span>
              </div>
              {plan.places.length > 0 && (
                <div className="row">
                  <button type="button" className="btn btn-secondary" onClick={async () => {
                    const ok = await copyText(shareUrl(shared));
                    setStatus(ok ? 'Link kopiert.' : 'Kopieren nicht möglich – bitte den Link aus der Adresszeile nehmen.');
                  }}><Link2 size={18} aria-hidden="true" />Link kopieren</button>
                  <button type="button" className="btn btn-secondary" onClick={() => sendPlan(`Reiseplan: ${title}`, subtitle, shareUrl(shared))}>
                    <Send size={18} aria-hidden="true" />Senden
                  </button>
                  <Link to="/plan/druck" className="btn btn-primary"><FileDown size={18} aria-hidden="true" />Als PDF exportieren</Link>
                </div>
              )}
            </div>
            {status && <div className="notice" aria-hidden="true">{status}</div>}
            {plan.places.length ? (
              <PlanView plan={plan} month={trip.month} />
            ) : (
              <div className="empty">Wähle zuerst Orte aus. <button type="button" className="btn btn-secondary btn-small" onClick={() => goStep(1)}>Zu den Vorschlägen</button></div>
            )}
            <div className="row between">
              <button type="button" className="btn btn-secondary" onClick={() => goStep(3)}>Zurück zu den Verbindungen</button>
              <button type="button" className="btn btn-secondary" onClick={() => {
                if (confirm('Reiseplan und Vorlieben löschen und neu anfangen?')) {
                  trip.reset();
                  navigate('/planer?schritt=1');
                }
              }}><RotateCcw size={18} aria-hidden="true" />Neu anfangen</button>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
