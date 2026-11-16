# Reisezeit

Statische Web-App: Wann ist wo das beste Wetter? Länderübersicht mit 12-Monats-Ampel, Länderdetail je Region und ein Reiseplaner in vier Schritten (Vorlieben → Orte → Verkehrsmittel → Reiseplan) mit automatischer Route, Karte, PDF-Export und Teilen per Link. Kein Backend, kein Login – der Plan liegt im Browser.

Umgesetzt nach `docs/implementierungskonzept.md`.

## Schnellstart

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # Unit-Tests (Vitest) für den Algorithmus
npm run check:data   # Datendateien gegen das Zod-Schema prüfen
npm run build        # check:data + Typprüfung + statischer Build nach dist/
npm run test:e2e     # Playwright-Durchlauf (baut vorher)
```

Bei vorinstalliertem Chromium: `PW_CHROMIUM_PATH=/pfad/zu/chromium npm run test:e2e`.

## Deployment (All-Inkl)

1. Subdomain mit eigenem Ordner anlegen und SSL aktivieren (nötig für „Link kopieren“ und Web Share).
2. `npm run build`, dann den **Inhalt** von `dist/` per FTP in den Ordner laden. `.htaccess` (Komprimierung, Caching) ist dabei.
3. Hash-Routing und relative Pfade (`base: './'`) – keine Server-Regeln nötig, läuft auch im Unterordner.

## Aufbau

```
src/
  data/       countries.json (72 Länder, 145 Regionen), places.json (77 Orte), interests.json, schema.ts (Zod)
  domain/     reine Funktionen ohne React: climate, filter, score, route, transport, timeline, planLink, projection
              config.ts = alle Gewichte, Punktetabellen und Schwellen an einer Stelle
  store/      Zustand-Store mit persist (localStorage-Schlüssel reisezeit-trip-v1)
  pages/      Startseite, Länderdetail, Planer, Druckansicht, geteilter Plan, Impressum/Datenschutz
  components/ Monatsleiste, Karten (Leaflet + SVG), Stopp-Liste, Strecken, Zeitleiste …
  i18n/de.ts  alle UI-Texte
scripts/      check-data.ts, import-mockup.mjs (einmaliger Datenimport), make-scenes.mjs (Landschafts-SVGs)
```

Routen: `#/`, `#/land/:id`, `#/planer?schritt=1..4`, `#/plan/druck`, `#/plan/:code`, `#/impressum`, `#/datenschutz`. Startseiten-Filter stehen im Link (`#/?monat=3&kontinent=Asien`).

## Daten

Länder und Regionen stammen aus dem Mockup (`Main.dc.html`), ergänzt um die Regionen/Länder der ersten Reisezeiten-Übersicht (Asien/Afrika). Orte stammen aus `Planner.dc.html`. Neu einlesen:

```bash
node scripts/import-mockup.mjs pfad/Main.dc.html pfad/Planner.dc.html
```

Das Skript liest die Arrays nur als Text/JSON, es führt keinen Code aus dem Mockup aus.

**Geschätzte Werte – bitte nachpflegen:** Felder, die das Mockup nicht kannte, sind per Regel vorbelegt:

| Feld | Vorbelegung |
| --- | --- |
| `interests` | Stärke pauschal 3 für jede Vorliebe aus dem Mockup |
| `crowd` | aus dem Klima-Code (G=2, L/Y=1, R=0) plus Ferienspitzen (Europa Jul/Aug, Südostasien Dez/Jan, Südamerika Jan/Feb) |
| `priceLevel`, `flightHoursFromDE` | je Land, einige Orte einzeln |
| `stays.budget` / `stays.luxus` | allgemeine Texte nach Ortstyp (`komfort` stammt aus dem Mockup) |
| `closedMonths`, `events`, `maxTempC` | nur für wenige Orte (Koh Lanta, Torres del Paine, Uyuni, Chiang Mai …) |
| `safety`, `malaria` | überall 0 bzw. nicht gesetzt |

Die Planer-Orte decken bisher nur Südostasien, Südamerika und Europa ab (wie im Mockup); Afrika und das übrige Asien sind in der Übersicht, aber noch nicht im Planer.

## Abweichungen und offene Punkte

- Styling über globale CSS-Klassen in `styles/base.css` mit den Tokens aus `tokens.css` statt CSS-Module.
- PDF Stufe 1 (Druckansicht + `window.print()`); Stufe 2 (jsPDF-Download) ist noch nicht gebaut.
- Die Karte im Reiseplan ist zunächst eine lokale SVG-Karte (Natural-Earth-Küsten). Die Leaflet/OSM-Karte lädt erst nach Klick („Interaktive Karte laden“) – keine IP-Übertragung ohne Zustimmung.
- Interessen-Kacheln: Tippen schaltet an → „Muss“ (Stern) → aus; langes Drücken setzt direkt „Muss“.
- Impressum und Datenschutz enthalten Platzhalter `[NAME]` usw. – vor dem Livegang ausfüllen und prüfen lassen.
- Drag-and-drop in der Stopp-Liste fehlt noch (Pfeiltasten sind da).
- Orte je Region (Länderdetail und Länderkachel): Planer-Orte aus `places.json` plus Namen aus dem Regionsnamen (`domain/cities.ts`). Planer-Orte lassen sich direkt zur Route hinzufügen.
