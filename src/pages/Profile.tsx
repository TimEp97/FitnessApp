import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Equipment, Goal, Level, Settings } from '../types';
import { useSettings } from '../stores/settings';
import { deleteAllData, exportData, importData, removeSampleData } from '../stores/data';
import { Page } from '../components/Page';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { Stepper } from '../components/Stepper';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { EQUIPMENT, EQUIPMENT_LABEL, GOAL_LABEL, LEVEL_LABEL } from '../data/labels';
import { dayKey } from '../logic/dates';
import s from './Profile.module.css';

export const SESSION_OPTIONS = [30, 45, 60, 75, 90];

export function Profile() {
  const settings = useSettings((st) => st.settings);
  const update = useSettings((st) => st.update);
  const navigate = useNavigate();
  const { hash } = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importText, setImportText] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const set = (patch: Partial<Settings>) => void update(patch);
  const toggleEquipment = (e: Equipment) =>
    set({ equipment: settings.equipment.includes(e) ? settings.equipment.filter((x) => x !== e) : [...settings.equipment, e] });

  const doExport = async () => {
    const blob = await exportData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `athletic-backup-${dayKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ kind: 'ok', text: 'Sicherung wurde heruntergeladen.' });
  };

  return (
    <Page title="Profil">
      <div className="grid">
        <section className="card stackLg" aria-labelledby="about-title">
          <h2 id="about-title" className="h2">
            Über dich
          </h2>
          <div>
            <label className="fieldLabel" htmlFor="name">
              Name
            </label>
            <input id="name" className="input" value={settings.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} autoComplete="given-name" />
          </div>
          <fieldset className={s.fieldset}>
            <legend className="fieldLabel">Ziel</legend>
            <div className="chipsWrap">
              {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
                <button key={g} type="button" className="chip" aria-pressed={settings.goal === g} onClick={() => set({ goal: g })}>
                  {GOAL_LABEL[g]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={s.fieldset}>
            <legend className="fieldLabel">Erfahrung</legend>
            <div className="chipsWrap">
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                <button key={l} type="button" className="chip" aria-pressed={settings.experience === l} onClick={() => set({ experience: l })}>
                  {LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card stackLg" aria-labelledby="training-title">
          <h2 id="training-title" className="h2">
            Training
          </h2>
          <Stepper size="sm" label="Trainingstage pro Woche" value={settings.daysPerWeek} onChange={(v) => v !== null && set({ daysPerWeek: v })} step={1} min={1} max={7} />
          <fieldset className={s.fieldset}>
            <legend className="fieldLabel">Dauer pro Einheit</legend>
            <div className="chipsWrap">
              {SESSION_OPTIONS.map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={settings.sessionMinutes === m} onClick={() => set({ sessionMinutes: m })}>
                  {m} min
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={s.fieldset}>
            <legend className="fieldLabel">Vorhandenes Equipment</legend>
            <div className="chipsWrap">
              {EQUIPMENT.map((e) => (
                <button key={e} type="button" className="chip" aria-pressed={settings.equipment.includes(e)} onClick={() => toggleEquipment(e)}>
                  {EQUIPMENT_LABEL[e]}
                </button>
              ))}
            </div>
          </fieldset>
          <Stepper size="sm" label="Pausendauer" unit="Sekunden" value={settings.restSeconds} onChange={(v) => v !== null && set({ restSeconds: v })} step={15} min={15} max={600} />
        </section>

        <section className="card stackLg" aria-labelledby="look-title">
          <h2 id="look-title" className="h2">
            Darstellung
          </h2>
          <div>
            <span className="fieldLabel" id="theme-label">
              Erscheinungsbild
            </span>
            <Segmented
              label="Erscheinungsbild"
              value={settings.theme}
              onChange={(theme) => set({ theme })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'dark', label: 'Dunkel' },
                { value: 'light', label: 'Hell' },
              ]}
            />
          </div>
          <div className="row">
            <span className="spacer">Einheiten</span>
            <span className="muted">Kilogramm, Zentimeter</span>
          </div>
          <Link to="/uebungen" className="listRow">
            <span className="spacer">Übungsbibliothek</span>
            <Icon name="chevronRight" className="muted" />
          </Link>
          <button type="button" className="btn btnBlock" onClick={() => navigate('/onboarding')}>
            Onboarding wiederholen
          </button>
        </section>

        <section className="card stack" aria-labelledby="int-title">
          <h2 id="int-title" className="h2">
            Integrationen
          </h2>
          <ul className="list">
            {['Apple Health', 'Apple Watch', 'Widgets', 'Live Activities'].map((n) => (
              <li key={n} className="listRow" aria-disabled="true">
                <Icon name="lock" className="muted" size={20} />
                <span className="spacer muted">{n}</span>
                <span className={s.later}>Spätere Ausbaustufe</span>
              </li>
            ))}
          </ul>
          <p className="notice">Diese Funktionen benötigen eine native iOS-App und sind in der Web-App nicht verfügbar.</p>
        </section>

        <section id="daten" className="card stack span2" aria-labelledby="data-title">
          <h2 id="data-title" className="h2">
            Daten
          </h2>
          <p className="notice">Alle Daten liegen nur auf diesem Gerät, in diesem Browser. Es gibt kein Konto und keine Übertragung. Exportiere regelmäßig eine Sicherung.</p>
          {message && (
            <p className={message.kind === 'error' ? 'fieldError' : 'accentText'} role={message.kind === 'error' ? 'alert' : 'status'}>
              {message.text}
            </p>
          )}
          <div className={s.dataButtons}>
            <button type="button" className="btn btnPrimary" onClick={doExport}>
              <Icon name="download" size={20} /> Exportieren
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={20} /> Importieren
            </button>
            {settings.hasSampleData && (
              <button type="button" className="btn" onClick={() => setSampleOpen(true)}>
                Beispieldaten entfernen
              </button>
            )}
            <button type="button" className="btn btnDanger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={20} /> Alle Daten löschen
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="srOnly"
            tabIndex={-1}
            aria-hidden="true"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) setImportText(await file.text());
            }}
          />
        </section>
      </div>
      <p className="notice">ATHLETIC · Version 0.1 · ohne Tracking</p>

      <Sheet open={sampleOpen} onClose={() => setSampleOpen(false)} title="Beispieldaten entfernen?">
        <p className="muted">Beispiel-Workouts und Körperwerte werden gelöscht. Die Übungsbibliothek bleibt erhalten. Sollen die Beispielpläne bleiben?</p>
        <button
          type="button"
          className="btn btnBlock btnLg"
          onClick={async () => {
            await removeSampleData(true);
            setSampleOpen(false);
            setMessage({ kind: 'ok', text: 'Beispieldaten entfernt, Pläne behalten.' });
          }}
        >
          Entfernen, Pläne behalten
        </button>
        <button
          type="button"
          className="btn btnBlock btnLg btnDanger"
          onClick={async () => {
            await removeSampleData(false);
            setSampleOpen(false);
            setMessage({ kind: 'ok', text: 'Beispieldaten und Beispielpläne entfernt.' });
          }}
        >
          Entfernen, auch die Pläne
        </button>
        <button type="button" className="btn btnBlock btnGhost" onClick={() => setSampleOpen(false)}>
          Abbrechen
        </button>
      </Sheet>

      <ConfirmSheet
        open={deleteOpen}
        title="Alle Daten löschen?"
        message="Pläne, Workouts, Körperwerte, eigene Übungen und Einstellungen werden unwiderruflich gelöscht. Exportiere vorher eine Sicherung, wenn du sie behalten willst."
        confirmLabel="Endgültig löschen"
        danger
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deleteAllData();
          setDeleteOpen(false);
          navigate('/onboarding', { replace: true });
        }}
      />

      <ConfirmSheet
        open={importText !== null}
        title="Sicherung importieren?"
        message="Alle aktuellen Daten werden durch die Sicherung ersetzt."
        confirmLabel="Importieren und ersetzen"
        danger
        onClose={() => setImportText(null)}
        onConfirm={async () => {
          try {
            await importData(importText ?? '');
            setMessage({ kind: 'ok', text: 'Sicherung importiert.' });
          } catch (err) {
            setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Import fehlgeschlagen.' });
          }
          setImportText(null);
        }}
      />
    </Page>
  );
}
