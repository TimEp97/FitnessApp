# Reisezeit

Statische Web-App: Wann ist wo das beste Wetter? Länderübersicht mit 12-Monats-Ampel und Einreise-Infos, ein Reiseplaner, der aus drei Fragen automatisch einen Reiseplan mit Route, Karte und bebildertem PDF baut, und ein Reiseprofil mit Punkten, Auszeichnungen und Vergleich. Kein Backend, kein Login – alles liegt im Browser.

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

## Ablauf für Nutzer

1. **Drei Fragen** (`#/planer`): Wann? Wie lange? Was ist dir wichtig? Weitere Einstellungen sind eingeklappt.
2. **„Reiseplan erstellen“**: Route, Nächte und Verkehrsmittel entstehen automatisch (`domain/route.ts`). Orte und Verkehrsmittel lassen sich danach über „Anpassen“ ändern, müssen aber nicht.
3. **„PDF herunterladen“**: mehrseitiges A4-PDF mit Titelbild des Landes, Karte, Tagesplan, einer Karte je Stopp mit Bild und den Einreise-Infos je Land. Die Seiten werden im Browser gerendert (`html-to-image` + `jsPDF`, erst beim Klick geladen); „Drucken“ bleibt als Alternative.

## Länder-Infos (Visum, Aufenthalt)

`src/data/countryInfo.ts` enthält je Land eine Kurzfassung für deutsche Staatsangehörige: Visum, erlaubter Aufenthalt, Reisedokument, Währung, Zeitverschiebung. Sie erscheint auf der Länderseite, der Länderkachel, im Reiseplan und im PDF.

**Achtung:** Die Angaben sind von Hand zusammengestellt (Stand siehe `INFO_STAND`) und nicht gegen eine amtliche Quelle abgeglichen. Vor dem Livegang Land für Land mit dem Auswärtigen Amt prüfen und danach regelmäßig pflegen. In der App steht überall der Hinweis „ohne Gewähr“ mit Link zum Auswärtigen Amt.

## Reiseprofil, Punkte und Vergleich

- `#/profil`: bereiste Länder (Weltliste mit rund 200 Ländern, `data/world.ts`) und Orte ankreuzen.
- Punkte: 10 je Land, 25 je Kontinent, 3 je Ort. Daraus ergeben sich Stufen (Neuling … Reiselegende) und 13 Auszeichnungen (`domain/profile.ts`).
- Vergleich ohne Server: Der Profil-Link (`#/vergleich/<code>`) enthält Name, Länder und Orte. Wer ihn öffnet, sieht den direkten Vergleich und kann die Person in seine lokale Rangliste aufnehmen.
- Eine öffentliche Rangliste über alle Nutzer gibt es nicht – dafür wäre ein Server mit Konten nötig.

## Bilder

`src/images.ts` liefert für jedes Land und jeden Ort ein Foto, falls eines in `src/data/photos.json` steht, sonst eine Illustration. Fotos lädt

```bash
node scripts/fetch-photos.mjs      # braucht Zugriff auf en.wikipedia.org, commons.wikimedia.org, upload.wikimedia.org
```

von Wikimedia Commons (Hauptbild des Artikels aus `scripts/photo-sources.json`), nur mit Lizenz CC0, Public Domain, CC BY oder CC BY-SA. Autor, Lizenz und Quelle landen in `photos.json` und erscheinen automatisch im Impressum und im PDF. Nach dem Laden die Bilder einmal durchsehen – das Hauptbild eines Artikels passt nicht immer.

## Handy- und Desktop-Version

Eine App, zwei Layouts – die Umschaltung passiert automatisch über die Bildschirmbreite (`styles/base.css`):

| | Handy (< 768 px) | Laptop/Desktop (≥ 1024 px) |
| --- | --- | --- |
| Navigation | Tab-Leiste unten: Länder · Planen · Mein Plan (mit Anzahl Orte) | Navigation rechts im Kopf |
| Startseite | Filter oben, Chips seitlich wischbar, Kacheln einspaltig | Filterleiste links (mitlaufend), Kacheln rechts im Raster |
| Länderdetail | Bild oben, Regionen untereinander | Bild neben Text, Regionen zweispaltig |
| Planer | Schrittanzeige „Schritt 2 von 4“, Aktionsknöpfe fest über der Tab-Leiste, kurze Knopftexte | Vorlieben links (mitlaufend), Vorschläge rechts |
| Reiseplan | Kennzahlen 2 × 2, Karte über dem Tagesablauf | Karte läuft beim Scrollen neben dem Tagesablauf mit |

Dazwischen (Tablet) gilt das fließende Grundlayout. Die Playwright-Tests laufen in beiden Layouts (Projekte `handy` und `desktop`).

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

Routen: `#/`, `#/land/:id`, `#/planer?schritt=1..4` (1 Wünsche, 4 Reiseplan, 2/3 Anpassen), `#/plan/druck`, `#/plan/:code`, `#/profil`, `#/vergleich/:code`, `#/impressum`, `#/datenschutz`. Startseiten-Filter stehen im Link (`#/?monat=3&kontinent=Asien`).

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
- Das PDF besteht aus Seitenbildern (nicht aus Vektortext); der Text im PDF ist daher nicht markierbar. „Drucken → Als PDF speichern“ liefert weiterhin ein Vektor-PDF.
- Die Karte im Reiseplan ist zunächst eine lokale SVG-Karte (Natural-Earth-Küsten). Die Leaflet/OSM-Karte lädt erst nach Klick („Interaktive Karte laden“) – keine IP-Übertragung ohne Zustimmung.
- Interessen-Kacheln: Tippen schaltet an → „Muss“ (Stern) → aus; langes Drücken setzt direkt „Muss“.
- Impressum und Datenschutz enthalten Platzhalter `[NAME]` usw. – vor dem Livegang ausfüllen und prüfen lassen.
- Drag-and-drop in der Stopp-Liste fehlt noch (Pfeiltasten sind da).
- Orte je Region (Länderdetail und Länderkachel): Planer-Orte aus `places.json` plus Namen aus dem Regionsnamen (`domain/cities.ts`). Planer-Orte lassen sich direkt zur Route hinzufügen.
