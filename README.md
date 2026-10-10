# ATHLETIC

Fitness-Tracking für Krafttraining als Web-App. Mobile-first, offline nutzbar und auf dem iPhone als PWA installierbar. Alle Daten bleiben lokal im Browser (IndexedDB), es gibt kein Backend und kein Konto.

## Schnellstart

```bash
npm install
npm run dev          # Entwicklungsserver auf http://localhost:5173
npm test             # Unit-Tests (Vitest)
npm run test:e2e     # End-to-End-Tests (Playwright, baut vorher)
npm run build        # statischer Build nach dist/
npm run preview      # Build lokal ansehen
```

## Deployment

`npm run build` erzeugt in `dist/` eine rein statische Seite. Den Ordnerinhalt auf einen beliebigen Webspace mit HTTPS kopieren, fertig. Die App nutzt relative Pfade und Hash-Routing (`#/training`), daher braucht der Server keine Rewrite-Regeln und die App läuft auch in einem Unterverzeichnis. HTTPS ist nötig, damit Service Worker (Offline-Betrieb) und Installation als PWA funktionieren.

Auf dem iPhone: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Technik

| Bereich | Umsetzung |
|---|---|
| Framework | React 18, TypeScript, Vite |
| Routing | React Router (HashRouter), 5 Tabs plus Unterseiten |
| State | Zustand, ein Store je Domäne (`src/stores`) |
| Speicherung | IndexedDB über Dexie (`src/db`) |
| Styling | CSS-Variablen (`src/styles/global.css`) und CSS Modules, kein UI-Framework |
| Diagramme | eigene SVG-Komponenten (`src/components/charts`) |
| PWA | vite-plugin-pwa, Manifest und Icons (`npm run icons` erzeugt sie neu) |
| Tests | Vitest (`src/**/*.test.ts`), Playwright (`e2e/`) |

## Aufbau

```
src/
  types.ts              Datenmodell
  data/                 Übungsbibliothek (55 Übungen), Planvorlagen, Beschriftungen
  db/                   Dexie-Datenbank, Beispieldaten
  logic/                reine Logik: Kennzahlen, Rekorde, Streak, Muskelbelastung,
                        Gewichts- und Übungsvorschläge, Planung, Sicherung
  stores/               Zustand-Stores (Einstellungen, Übungen, Pläne, Workouts, Körperwerte)
  components/           Tab-Leiste, Muskelkarte, Satz-Eingabe, Pausen-Timer, Diagramme …
  pages/                Screens: Home, Training, Plan bearbeiten, Workout, Zusammenfassung,
                        Muskeln, Fortschritt, Übungen, Übungsdetail, Profil, Onboarding
e2e/                    Playwright-Tests der Kernabläufe
```

## Umsetzungsentscheidungen

- **Hash-Routing** statt History-Routing, damit der Build ohne Serverkonfiguration auf jedem Webspace läuft.
- **Beispieldaten** sind mit `sample: true` markiert. „Beispieldaten entfernen“ löscht nur diese Workouts und Körperwerte, eigene Einträge bleiben. Die Beispielpläne werden auf Nachfrage behalten oder entfernt.
- **Laufendes Workout**: Der Bedienzustand (aktuelle Übung, Pause, Pausen-Timer) liegt im Feld `cursor` des Workouts und wird nach jeder Änderung gespeichert. Nach einem Neustart geht es an derselben Stelle weiter.
- **Rekorde und Statistiken** werden immer aus den Workouts berechnet und nicht gespeichert.
- **Schwellen der Muskelkarte** stehen als Konstanten in `src/logic/muscleLoad.ts` (`LOAD_THRESHOLDS`).
- **Einheiten**: Kilogramm und Zentimeter. Eine Umstellung auf Pfund ist nicht umgesetzt.
- **Kalorien** werden bewusst nicht angezeigt.
- Kein Tracking, keine externen Anfragen außer dem Laden der App selbst.

## Offene Punkte

- **Illustrationen**: Es gibt noch keine Grafiken für Übungen und keine anatomisch genaue Körperfigur. Übungen zeigen einen beschrifteten Platzhalter, die Muskelkarte ist eine vereinfachte Figur. Grafiken können über das Feld `illustration` einer Übung eingebunden werden.
- **Schwellen der Muskelbelastung** (unter 4, 4 bis 12, über 12 bis 18, über 18 Sätze pro Woche) sind Startwerte und sollten vor der Veröffentlichung fachlich geprüft werden.
- **Sync zwischen Geräten** ist nicht vorgesehen und bräuchte ein Backend mit Konto. Export und Import als JSON dienen als Backup.
- **HealthKit, Apple Watch, Widgets, Live Activities** erscheinen im Profil als „Spätere Ausbaustufe“.
