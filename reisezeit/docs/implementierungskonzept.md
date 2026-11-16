# Reisezeit – Implementierungskonzept Web-App

Stand: 16.11.2026 · Autor: Tim · Status: Entwurf zur Umsetzung

Dieses Dokument beschreibt, wie die Web-App „Reisezeit" in Code umgesetzt wird: Technik, Projektstruktur, Datenmodell, Screens (nach Mockup), Algorithmus, Karte, PDF-Export, Tests, Deployment und Reihenfolge der Arbeitspakete. Es ist so geschrieben, dass man es Abschnitt für Abschnitt abarbeiten oder einem Coding-Agenten (z. B. Claude Code) als Vorgabe geben kann.

## 0. Referenzen

| Was | Link | Inhalt |
| --- | --- | --- |
| Mockup (Design-Canvas) | https://claude.ai/artifact/DhKcAbUFgBwYhULNBmBcq2 | 6 Ansichten: Startseite, Länderdetail, Mobil, Planer Schritt 1, fertiger Reiseplan, PDF-Seite |
| Konzept Empfehlungs-Algorithmus | https://claude.ai/artifact/VZLACuDxuRShtsQiRgJwnf | Eingaben, Score-Formel, Filter, Routenbau, Rechenbeispiele |
| Reisezeiten-Übersicht (erste Fassung) | https://claude.ai/artifact/Ng3oaPU3s8z5TCBpot3eh4 | 96 Regionen Asien/Afrika mit Monats-Codes und Tipps |

Die Links sind privat; zum Weitergeben im jeweiligen Artefakt freigeben. Die Mockup-Dateien enthalten bereits lauffähige Logik (Filter, Bereichstexte, Verkehrsmittel-Vorschlag, Kartenprojektion), die als Vorlage für den echten Code dient.

---

## 1. Ziel und Umfang

**Produkt in einem Satz:** Der Nutzer sagt, wann er reisen will und was ihm wichtig ist; die App zeigt, wo dann gutes Wetter ist, schlägt passende Orte vor, baut eine Route mit Verkehrsmitteln und exportiert den Plan als PDF.

### Umfang MVP (Version 1.0)

- Länder- und Regionsübersicht mit 12-Monats-Farbleiste (Grün / Hellgrün / Gelb / Rot)
- Suche, Kontinent-Filter, Monats-Filter
- Länderdetail mit Regionen, Erklärung je Monat, Tipps
- Reiseplaner in 4 Schritten: Vorlieben → Orte → Verkehrsmittel → Reiseplan
- Empfehlungs-Algorithmus (Score 0–100) und automatische Route
- Karte mit Stopps und Linien je Verkehrsmittel
- PDF-Export (A4, eine Seite) und Teilen per Link
- Reiseplan lokal im Browser gespeichert (kein Login)

### Nicht im MVP

- Nutzerkonten, Server, Datenbank
- Echte Fahrpläne, Flugpreise, Hotelbuchung
- Lernen aus Nutzerverhalten (Stufe 2/3 im Algorithmus-Konzept)
- Mehrsprachigkeit (nur Deutsch, Texte aber von Anfang an in einer Datei gesammelt)

---

## 2. Technische Architektur

**Grundsatz:** Reine statische Web-App ohne Backend. Alle Daten liegen als JSON im Build, der Algorithmus läuft im Browser. Das passt zum All-Inkl-Webspace (Build lokal, Upload per FTP wie bei der Energieberater-App).

| Baustein | Wahl | Begründung |
| --- | --- | --- |
| Build-Tool | Vite | schnell, erzeugt statische Dateien für FTP-Upload |
| Sprache | TypeScript | Datenmodell und Algorithmus typsicher |
| UI | React 18 | Mockup-Logik (State, Listen, Bedingungen) lässt sich 1:1 übertragen |
| Routing | React Router mit **HashRouter** | funktioniert auf Shared Hosting ohne Server-Konfiguration |
| State | Zustand (mit `persist`) | kleiner Store, speichert den Plan in localStorage |
| Styling | CSS-Variablen + CSS-Module | Design-Tokens aus dem Mockup, kein Framework nötig |
| Karte | Leaflet + OpenStreetMap-Kacheln | kostenlos, keine API-Schlüssel |
| PDF | Druckansicht + `window.print()` (Stufe 1), später `jsPDF` + `html2canvas` (Stufe 2) | Stufe 1 ist in einem Tag fertig und liefert sauberes Vektor-PDF |
| Icons | Lucide (SVG) | entspricht dem Strich-Stil der Mockup-Icons |
| Tests | Vitest (Algorithmus), Playwright (ein Durchlauf-Test) | Algorithmus ist reine Funktion und gut testbar |
| Daten-Prüfung | Zod-Schema + Skript `npm run check:data` | verhindert kaputte Datensätze (z. B. Code mit 11 statt 12 Zeichen) |

**Schichten**

```
UI (React-Komponenten, Seiten)
        │ liest / schreibt
State (Zustand-Store: Eingaben, Stopps, gewählte Verkehrsmittel)
        │ ruft auf
Domain (reine Funktionen, ohne React): filtern · bewerten · routeBauen · verkehr · klima
        │ liest
Daten (JSON: countries, places, interests, events)
```

Wichtig: Der Ordner `domain/` importiert nichts aus React. So bleibt der Algorithmus testbar und könnte später auf einen Server wandern.

---

## 3. Projektstruktur

```
reisezeit/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ public/
│  ├─ fonts/                 # Inter, Space Grotesk (selbst gehostet, siehe 13)
│  └─ img/scenes/            # Landschafts-Illustrationen als SVG
├─ scripts/
│  ├─ check-data.ts          # prüft alle JSON gegen das Zod-Schema
│  └─ climate-to-codes.ts    # später: Klimadaten → G/L/Y/R
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                # Router + Layout
│  ├─ data/
│  │  ├─ countries.json
│  │  ├─ places.json
│  │  ├─ interests.json
│  │  └─ schema.ts           # Zod-Schemas + abgeleitete TS-Typen
│  ├─ domain/
│  │  ├─ climate.ts          # Codes, Bereichstexte (ranges), Aggregation
│  │  ├─ filter.ts           # harte Filter
│  │  ├─ score.ts            # Score-Formel + Begründungstexte
│  │  ├─ route.ts            # Anker, Cluster, Reihenfolge, Nächte
│  │  ├─ transport.ts        # Verkehrsmittel-Optionen je Strecke
│  │  ├─ geo.ts              # Entfernung (Haversine)
│  │  └─ *.test.ts
│  ├─ store/
│  │  └─ tripStore.ts
│  ├─ pages/
│  │  ├─ HomePage.tsx        # Länderkacheln, Suche, Filter
│  │  ├─ CountryPage.tsx     # Länderdetail
│  │  ├─ PlannerPage.tsx     # Schritte 1–4
│  │  └─ PrintPage.tsx       # A4-Druckansicht
│  ├─ components/
│  │  ├─ MonthBar.tsx        # 12er-Farbleiste
│  │  ├─ MonthChips.tsx
│  │  ├─ CountryCard.tsx
│  │  ├─ RegionCard.tsx
│  │  ├─ InterestTiles.tsx
│  │  ├─ SuggestionCard.tsx
│  │  ├─ StopList.tsx
│  │  ├─ LegCard.tsx
│  │  ├─ TripMap.tsx         # Leaflet
│  │  ├─ TripMapStatic.tsx   # SVG-Karte für PDF
│  │  ├─ Timeline.tsx
│  │  └─ Stepper.tsx
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ base.css
│  │  └─ print.css
│  └─ i18n/de.ts             # alle UI-Texte
└─ e2e/planner.spec.ts
```

---

## 4. Datenmodell

Kleinste Einheit ist der **Ort** (für Planer und Algorithmus). **Regionen** gehören zu Ländern und tragen die Klima-Codes für die Übersicht. Orte verweisen auf ihre Region und erben deren Klima-Code, können ihn aber überschreiben.

```ts
// src/data/schema.ts (als Zod-Schemas definieren, Typen ableiten)

export type ClimateCode = 'G' | 'L' | 'Y' | 'R';
// G = beste Zeit · L = gut & ruhiger · Y = mittel · R = schlecht
export type Months12 = string;            // genau 12 Zeichen aus G/L/Y/R, Jan–Dez

export type Continent = 'Asien' | 'Afrika' | 'Südamerika' | 'Europa';
export type InterestId =
  | 'strand' | 'surfen' | 'tauchen' | 'berge' | 'kultur' | 'food'
  | 'natur' | 'nightlife' | 'ruhe' | 'abenteuer' | 'city' | 'stays';
export type SceneId =
  | 'beach' | 'lagoon' | 'temple' | 'mountain' | 'safari' | 'desert'
  | 'city' | 'rice' | 'fjord' | 'snow' | 'coast' | 'saltflat' | 'jungle';

export interface Region {
  id: string;                 // "th-andaman"
  name: string;               // "Andamanensee (Phuket, Krabi, Khao Lak, Koh Lanta)"
  climate: Months12;          // "GGGLYRRRRYLG"
  note: string;               // Tipp-Text
}

export interface Country {
  id: string;                 // ISO-2 klein: "th"
  name: string;
  continent: Continent;
  group: string;              // "Südostasien"
  scene: SceneId;
  tags: string[];             // Icon-Tags für die Kachel
  intro: string;
  regions: Region[];
}

export interface Place {
  id: string;                 // "lnt"
  name: string;               // "Koh Lanta"
  countryId: string;          // "th"
  regionId: string;           // "th-andaman"
  lat: number;
  lon: number;
  climate?: Months12;         // nur wenn abweichend von der Region
  crowd: string;              // 12 Ziffern 0–3, Andrang je Monat: "332100000013"
  priceLevel: 1 | 2 | 3;
  interests: Partial<Record<InterestId, 1 | 2 | 3>>;   // Stärke je Vorliebe
  tip: string;                // Programm-Vorschlag
  stays: { budget: string; komfort: string; luxus: string };
  events?: { month: number; name: string; interest?: InterestId; overridesRain?: boolean }[];
  transport: { airport: boolean; intlAirport?: boolean; rail: boolean; island: boolean };
  flightHoursFromDE: number;  // grobe Flugzeit ab Frankfurt inkl. Umstieg
  closedMonths?: number[];    // 0–11, saisonal geschlossen
  malaria?: boolean;
  maxTempC?: number[];        // optional, 12 Werte, für „keine Hitze über 35 °C"
  safety: 0 | 1 | 2;          // 0 ok · 1 Teilreisewarnung · 2 Reisewarnung
}
```

**Beispiel `places.json` (ein Eintrag)**

```json
{
  "id": "lnt",
  "name": "Koh Lanta",
  "countryId": "th",
  "regionId": "th-andaman",
  "lat": 7.62,
  "lon": 99.04,
  "crowd": "332100000013",
  "priceLevel": 2,
  "interests": { "strand": 3, "ruhe": 3, "tauchen": 2, "stays": 2 },
  "tip": "Lange Sandstrände, Nationalpark, Schnorcheln bei Koh Rok",
  "stays": {
    "budget": "Bambushütte in Strandnähe",
    "komfort": "Strandbungalow direkt am Sand",
    "luxus": "Pool-Villa am Hang mit Meerblick"
  },
  "transport": { "airport": false, "rail": false, "island": true },
  "flightHoursFromDE": 14,
  "closedMonths": [5, 6, 7, 8],
  "safety": 0
}
```

### Datenübernahme aus dem Mockup

Im Mockup liegen die Daten als Arrays in `Main.dc.html` (Variable `DATA`: Länder + Regionen) und `Planner.dc.html` (Variablen `PL`, `PREF`, `CODES`). Ein einmaliges Skript wandelt sie in `countries.json` und `places.json` um. Danach fehlen je Ort noch von Hand: `crowd`, `priceLevel`, Stärken 1–3 je Vorliebe (im Mockup nur Ja/Nein → erst pauschal 3 setzen, dann nachschärfen), `stays.budget`/`stays.luxus`, `flightHoursFromDE`.

**Datenqualität:** Die Klima-Codes sind von Hand gepflegte Durchschnittswerte. Vor dem Livegang stichprobenartig gegen eine Klimaquelle prüfen (siehe 16, offene Punkte).

---

## 5. Seiten und Routen

| Route | Seite | Mockup-Ansicht |
| --- | --- | --- |
| `#/` | Startseite: Länder, Suche, Filter | „Startseite – Länder & Suche" |
| `#/land/:id` | Länderdetail | „Detail – Thailand im März" |
| `#/planer` | Reiseplaner (Schritt über Query `?schritt=1..4`) | „Reiseplaner – Schritt 1" und „Schritt 4" |
| `#/plan/druck` | A4-Druckansicht | „PDF-Export (A4)" |
| `#/plan/:code` | geteilter Plan (Plan im Link kodiert) | – |
| `#/impressum`, `#/datenschutz` | Pflichtseiten | – |

Monat und Kontinent der Startseite stehen als Query im Link (`#/?monat=3&kontinent=Asien`), damit man Filter teilen kann.

---

## 6. Screens im Detail

### 6.1 Startseite

```
┌──────────────────────────────────────────────────────────┐
│ [Logo] Reisezeit                         [ Reise planen ] │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🔍 Land, Region oder Ort suchen                      │ │
│ └──────────────────────────────────────────────────────┘ │
│ (Alle)(Asien)(Afrika)(Südamerika)(Europa)                │
│ Wann willst du reisen?                                   │
│ (Jederzeit)(Jan)(Feb)(Mär)…(Dez)      ← horizontal scroll│
│ ■ Beste Zeit ■ Gut, weniger los ■ Mittel ■ Schlecht      │
├──────────────────────────────────────────────────────────┤
│ 38 Länder mit guter Reisezeit im März                    │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│ │ [Bild]     │ │ [Bild]     │ │ [Bild]     │             │
│ │ TH Thailand│ │ VN Vietnam │ │ …          │             │
│ │ ▮▮▮▮▮▮▮▮▮▮▮▮│ │ ▮▮▮▮▮▮▮▮▮▮▮▮│ │            │             │
│ │ Beste Zeit:│ │            │ │            │             │
│ │ Nov–Apr    │ │            │ │            │             │
│ │ (Im März: Beste Zeit in 4 von 4 Regionen) │             │
│ │ ⌂Kultur ≈Strand │          │ │            │             │
│ └────────────┘ └────────────┘ └────────────┘             │
└──────────────────────────────────────────────────────────┘
```

Verhalten:

- **Suche** durchsucht Landesname, Regionsnamen, Tipp-Texte und Tag-Namen (klein geschrieben, `includes`). Ab 300 ms Tipp-Pause filtern.
- **Länder-Farbleiste** = je Monat der beste Code über alle Regionen (`aggregate()` in `climate.ts`).
- **Monat gewählt:** nur Länder zeigen, deren aggregierter Code G oder L ist; sortiert G vor L. Kachel zeigt Urteil „Im März: Beste Zeit in 3 von 4 Regionen".
- **Leerer Zustand:** „Nichts gefunden. Probier einen anderen Monat oder Suchbegriff."
- Kachel ist ein `<a>`/`<button>` (Tastatur-bedienbar), Klick → `#/land/:id?monat=…`.

### 6.2 Länderdetail

- Kopf: großes Landschaftsbild, Name, Kontinent, Intro-Text, Tags, drei Kästen „Beste Zeit / Gut & ruhiger / Eher meiden".
- Je Region eine Karte: Name, Zusammenfassung („Beste Zeit: Dez–Mär · ruhiger: Apr, Nov"), 12 antippbare Monatszellen.
- **Klick auf Monatszelle:** Erklärkasten unter der Leiste mit Icon, Titel („März · Beste Zeit"), Standardtext je Code und dem Regions-Tipp. Ist global ein Monat gewählt, ist er vorausgewählt.
- Button „Reise hierhin planen" → Planer mit vorgewählter Region (`reg`) und Monat.

Standardtexte je Code (aus dem Mockup, in `i18n/de.ts`):

| Code | Text |
| --- | --- |
| G | Klimatisch die beste Zeit: überwiegend trocken und angenehme Temperaturen. Meist Hauptsaison – früh buchen. |
| L | Gute Reisezeit mit weniger Andrang: Wetter meist schön, Preise oft niedriger als in der Hochsaison. |
| Y | Mittelmäßig: je nach Region sehr heiß, eher kühl oder wechselhaft mit Schauern. Machbar, mit Abstrichen. |
| R | Eher meiden: Regenzeit, Monsun, Stürme oder extreme Hitze. Manche Unterkünfte und Touren sind geschlossen. |

### 6.3 Reiseplaner

Stepper oben: **1 Vorlieben · 2 Orte wählen · 3 Verkehrsmittel · 4 Reiseplan**. Jeder Schritt ist anklickbar; erledigte Schritte sind hellgrün markiert.

**Schritt 1 – Vorlieben**

```
Was magst du?
[≈ Strand][⌇ Surfen][◊ Tauchen][▲ Berge][⌂ Kultur][◡ Streetfood]
[❦ Natur][☾ Nachtleben][✿ Ruhe][⛺ Abenteuer][▥ Städte][⌂ Bes. Unterkünfte]

Wohin ungefähr?  (Überall)(Südostasien)(Südamerika)(Europa)
Reisemonat       (Jan)…(Dez)
Reisedauer       (1 Woche)(10 Tage)(2 Wochen)(3 Wochen)
Tempo            (Entspannt)(Ausgewogen)(Viel sehen)
Reisestil        (Budget)(Komfort)(Luxus)

Vorschläge für dich – 23 passende Orte      [Selbst zusammenstellen]
                                            [✦ Route automatisch vorschlagen]
┌────────────────────────┐
│ Koh Lanta      84 % Match│
│ Thailand                 │
│ (März: Beste Zeit)       │
│ ≈Strand ✿Ruhe ⌂Unterkunft│
│ Lange Sandstrände, …     │
│ 🛏 Schlafen: Strandbungalow│
│ [+ Zur Route]            │
└────────────────────────┘
```

- Vorlieben-Kacheln sind Umschalter (`aria-pressed`). Langes Drücken / zweiter Tipp markiert eine Vorliebe als „Muss" (Stern), maximal eine.
- Die Vorschlagsliste rechnet bei jeder Änderung neu (`useMemo`).
- „Route automatisch vorschlagen" ruft `buildRoute()` auf, schreibt die Stopps in den Store und springt zu Schritt 2.

**Schritt 2 – Orte wählen**

- Links „Deine Route": je Stopp Nummer, Name, Land, Wetter-Pille für den Monat, Nächte mit − / +, Pfeile hoch/runter, Entfernen. Summe „4 Stopps · 13 Nächte".
- Rechts „Ort hinzufügen": Suchfeld, Regions-Chips, Orts-Chips mit farbigem Wetterpunkt. Schon gewählte Orte grau.
- Später schöner: Drag-and-drop zum Sortieren (`@dnd-kit/sortable`), Pfeiltasten bleiben als barrierefreie Alternative.

**Schritt 3 – Verkehrsmittel**

- Je Strecke eine Karte: „Bangkok → Chiang Mai · Luftlinie ca. 580 km", darunter große Optionskacheln (Icon, Name, „ca. 13 h", ggf. „Empfohlen").
- Auswahl wird je Strecke unter dem Schlüssel `von>nach` gespeichert; ändert sich die Reihenfolge der Stopps, bleiben passende Auswahlen erhalten.

**Schritt 4 – Reiseplan**

- Kennzahlen: Reisedauer, Stopps, Länder, Zeit unterwegs.
- Warnungen (rot hinterlegt), wenn ein Stopp im Monat Code R hat oder saisonal geschlossen ist.
- Karte (links) und Tagesablauf (rechts): Stopp-Karten mit „Tag 1–3 · 3 Nächte", Programm, Wetter-Pille; dazwischen Reisezeilen „Tag 4: Nachtzug nach Chiang Mai · ca. 13 h"; am Ende „Rückreise ab …".
- Buttons: „Als PDF exportieren", „Link kopieren", „Senden" (Web Share API, falls vorhanden).

### 6.4 PDF-Seite (A4)

Aufbau wie im Mockup: grüner Kopf mit Titel („Bangkok bis Koh Lanta", „Thailand · März · 14 Tage"), Kennzahlen-Zeile, Karte, Tabelle „Tagesplan & Verbindungen" (Tage · Ort/Strecke · Programm · Wetter), Fußzeile mit Hinweis auf Durchschnittswerte.

---

## 7. Design-System

Aus dem Mockup übernommen. Alle Werte als CSS-Variablen in `styles/tokens.css`.

```css
:root {
  /* Flächen und Text */
  --bg: #F2F4F3;
  --surface: #FFFFFF;
  --ink: #13201E;
  --ink-2: #33433F;
  --mute: #4F5F5B;
  --line: #DCE3E0;
  --line-strong: #CBD5D1;
  --accent: #0F5C52;
  --accent-hover: #0A3F38;
  --accent-tint: #E4F1EE;

  /* Reisezeit-Ampel: Hintergrund / Text darauf */
  --g-bg: #1F7A44;  --g-fg: #FFFFFF;   /* beste Zeit */
  --l-bg: #A3DC9E;  --l-fg: #123A1E;   /* gut & ruhiger */
  --y-bg: #F2C94C;  --y-fg: #3A2C00;   /* mittel */
  --r-bg: #C9413A;  --r-fg: #FFFFFF;   /* schlecht */

  /* Verkehrsmittel auf der Karte */
  --t-land: #0F5C52;   /* Zug, Bus, Auto: durchgezogen */
  --t-flug: #C25E1F;   /* gestrichelt 6 5 */
  --t-faehre: #1E6FB8; /* gepunktet 2 6 */

  --radius-s: 8px; --radius-m: 12px; --radius-l: 16px; --radius-pill: 999px;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-head: 'Space Grotesk', 'Inter', sans-serif;
}
```

Regeln:

- **Ampel nie nur über Farbe:** Jede farbige Fläche hat zusätzlich Text oder `aria-label` („März: Beste Zeit"). Grün und Rot unterscheiden sich auch in der Helligkeit; für Farbfehlsichtige optional Muster (R = schraffiert) als Einstellung.
- Tippflächen mindestens 44 × 44 px. Text mindestens 4,5:1 Kontrast.
- Layout mobil zuerst: Kachelraster `repeat(auto-fill, minmax(250px, 1fr))`, Zweispalter im Planer per `flex-wrap`.
- Echte `<button>`, `<a>`, `<input>` mit `<label>`; Fokusrahmen sichtbar lassen.
- Dunkelmodus ist nicht im MVP, aber durch die Variablen vorbereitet.

**Bilder:** Im MVP die 13 Landschafts-Illustrationen aus dem Mockup als SVG-Dateien (`public/img/scenes/`). Echte Fotos später nur mit geklärter Lizenz (eigene Fotos oder freie Lizenz mit Namensnennung im Impressum).

---

## 8. State und Speicherung

```ts
// src/store/tripStore.ts
interface TripState {
  // Eingaben
  month: number;                    // 0–11
  days: 7 | 10 | 14 | 21;
  interests: InterestId[];
  mustHave?: InterestId;
  region: 'Alle' | 'Südostasien' | 'Südamerika' | 'Europa' | 'Afrika';
  pace: 'slow' | 'mid' | 'fast';    // 4 / 3 / 2 Nächte je Stopp
  style: 'budget' | 'komfort' | 'luxus';
  party: 'solo' | 'paar' | 'familie' | 'freunde';
  exclusions: { noLongHaul: boolean; noHeat: boolean; noMalaria: boolean };

  // Plan
  stops: { placeId: string; nights: number }[];
  legChoice: Record<string, TransportKind>;   // Schlüssel "bkk>cnx"

  // Aktionen
  setInput(patch: Partial<TripState>): void;
  addStop(placeId: string): void;
  removeStop(index: number): void;
  moveStop(from: number, to: number): void;
  setNights(index: number, nights: number): void;   // 1–21
  setLeg(key: string, kind: TransportKind): void;
  applyRoute(stops: TripState['stops']): void;      // setzt legChoice zurück
  reset(): void;
}
```

- `persist`-Middleware speichert unter dem Schlüssel `reisezeit-trip-v1` in localStorage. Bei Änderungen am Datenmodell Versionsnummer erhöhen und alte Daten verwerfen oder migrieren.
- Lesen und Schreiben in `try/catch`; ohne localStorage (privater Modus) läuft die App mit Standardwerten weiter.
- Abgeleitete Werte (Rangliste, Strecken, Tagesablauf, Warnungen) **nicht** speichern, sondern mit Selektoren / `useMemo` berechnen.

**Plan teilen per Link:** Plan als kompakter Text kodieren und in die URL schreiben, z. B. `#/plan/m2.d14.bkk3-cnx3-kbv3-lnt4.z-f-s` (Monat, Tage, Stopps mit Nächten, Verkehrsmittel-Kürzel). Kein Server nötig, Link bleibt kurz.

---

## 9. Algorithmus

Vollständige fachliche Beschreibung im Algorithmus-Konzept (Link oben). Hier die Umsetzung als reine Funktionen.

### 9.1 Klima-Helfer (`climate.ts`)

```ts
const RANK = { G: 4, L: 3, Y: 2, R: 1 } as const;

/** Klima-Code eines Orts: eigener Code oder der seiner Region */
export function climateOf(place: Place, regions: Map<string, Region>): Months12;

/** Bester Code je Monat über mehrere Regionen (für die Länderkachel) */
export function aggregate(codes: Months12[]): Months12;

/** "GGLYYYYYRRGG", "G" → "Nov–Feb" (mit Umbruch über den Jahreswechsel) */
export function ranges(code: Months12, which: ClimateCode): string;
```

`ranges()` und `aggregate()` existieren bereits im Mockup-Code und können übernommen werden. Testfälle: `ranges("GGLYYYYYRRGG","G")` → `"Nov–Feb"`, `ranges("LLLGGGGGGGLL","L")` → `"Nov–Mär"`, alle 12 gleich → `"ganzjährig"`, kein Treffer → `"–"`.

### 9.2 Harte Filter (`filter.ts`)

```ts
export function passesFilters(p: Place, inp: Inputs, ctx: Ctx): { ok: boolean; reason?: string } {
  const code = ctx.climate(p)[inp.month];
  const rainEvent = p.events?.some(e => e.month === inp.month && e.overridesRain);
  if (p.safety > 0)                                   return no('Reisewarnung');
  if (inp.region !== 'Alle' && ctx.area(p) !== inp.region) return no('Region');
  if (code === 'R' && !rainEvent)                     return no('Regenzeit');
  if (p.closedMonths?.includes(inp.month))            return no('geschlossen');
  if (matchScore(p, inp) === 0)                       return no('keine Vorliebe');
  if (inp.mustHave && (p.interests[inp.mustHave] ?? 0) < 2) return no('Muss fehlt');
  if (inp.exclusions.noLongHaul && p.flightHoursFromDE > 8) return no('Langstrecke');
  if (inp.exclusions.noMalaria && p.malaria)          return no('Malaria');
  if (inp.exclusions.noHeat && (p.maxTempC?.[inp.month] ?? 0) > 35) return no('Hitze');
  if (2 * p.flightHoursFromDE > 0.2 * inp.days * 24)  return no('Anreise zu lang');
  return { ok: true };
}
```

**Lockern bei zu wenig Treffern:** Bleiben weniger als 3 Orte, in dieser Reihenfolge lockern und dem Nutzer den Grund zeigen: (1) Region auf „Alle", (2) Ausschlüsse des Nutzers einzeln aufheben und nachfragen. Reisewarnungen und Regenzeit werden nie gelockert.

### 9.3 Bewertung (`score.ts`)

```
Score = 0,35·W + 0,35·P + 0,10·A + 0,10·B + 0,05·F + 0,05·E
```

```ts
const W_PTS = { G: 100, L: 85, Y: 45, R: 0 };
const A_PTS = [100, 85, 60, 40];                      // Andrang 0–3

export function scorePlace(p: Place, inp: Inputs, ctx: Ctx): Scored {
  const W = W_PTS[ctx.climate(p)[inp.month]];
  const P = matchScore(p, inp);                       // 0–100, siehe unten
  const A = A_PTS[Number(p.crowd[inp.month])];
  const B = budgetScore(p.priceLevel, inp.style);     // passt 100 · teurer 60/20 · günstiger 80
  const F = flightScore(p.flightHoursFromDE, inp.days);
  const E = p.events?.some(e => e.month === inp.month
            && (!e.interest || inp.interests.includes(e.interest))) ? 100 : 0;

  const w = weightsFor(inp.party);                    // Standard: .35 .35 .10 .10 .05 .05
  const total = Math.round(w.W*W + w.P*P + w.A*A + w.B*B + w.F*F + w.E*E);
  return { place: p, total, parts: { W, P, A, B, F, E }, reasons: buildReasons(...) };
}

/** Durchschnitt der Tag-Stärken über die gewählten Vorlieben, gewichtet */
function matchScore(p: Place, inp: Inputs): number {
  let sum = 0, wsum = 0;
  for (const id of inp.interests) {
    let w = 1;
    if (id === inp.mustHave) w = 2;
    if (inp.party === 'paar' && (id === 'ruhe' || id === 'stays')) w *= 1.5;
    if (inp.party === 'familie' && id === 'nightlife') continue;
    sum += w * ((p.interests[id] ?? 0) / 3) * 100;
    wsum += w;
  }
  return wsum ? sum / wsum : 0;
}
```

Anreise-Punkte `flightScore` (Spalte nach Reisedauer: bis 9 Tage „1 Woche", 10–17 „2 Wochen", ab 18 „3 Wochen"):

| Flugzeit | 1 Woche | 2 Wochen | 3 Wochen |
| --- | --- | --- | --- |
| bis 4 h | 100 | 100 | 100 |
| 4–8 h | 60 | 90 | 100 |
| 8–12 h | 20 | 70 | 90 |
| über 12 h | 0 | 50 | 80 |

Gewichte nach Mitreisenden (`weightsFor`): Familie → F 0,15 und A 0,00; sonst Standard. Alle Gewichte und Punktetabellen stehen in **einer** Datei `domain/config.ts`, damit man sie ohne Codesuche nachjustieren kann.

**Rangliste:** absteigend nach `total` sortieren; danach Vielfalt herstellen – höchstens 2 Orte je Land unter den ersten 6, weitere rücken nach hinten.

**Begründung** (`buildReasons`): die zwei stärksten Teile plus der schwächste Teil als Textbausteine, z. B. „Passt zu Strand, Ruhe und besondere Unterkünfte · im März Hauptsaison · Minus: 14 h Anreise". Die Textbausteine liegen in `i18n/de.ts`.

### 9.4 Routenbau (`route.ts`)

```ts
export function buildRoute(ranked: Scored[], inp: Inputs): Stop[] {
  const perStop = { slow: 4, mid: 3, fast: 2 }[inp.pace];
  const n = clamp(Math.round((inp.days - 1) / perStop), 2, ranked.length);
  const radius = areaOf(ranked[0].place) === 'Europa' ? 600 : 900;   // km

  // 1. Anker + Cluster: nächstbester Score im Umkreis eines gewählten Orts
  const picked = [ranked[0].place];
  while (picked.length < n) {
    const next = ranked.find(s => !picked.includes(s.place)
                 && picked.some(q => km(q, s.place) <= radius));
    if (!next) break;
    picked.push(next.place);
  }

  // 2. Mischung: jede gewählte Vorliebe mindestens einmal mit Stärke 3,
  //    sonst schwächsten Stopp durch besten passenden Ort im Umkreis ersetzen

  // 3. Reihenfolge: Start am Ort mit (internationalem) Flughafen, dann nächster Nachbar.
  //    Ruhe-/Strand-Ort ans Ende, wenn der Weg dadurch höchstens 20 % länger wird.

  // 4. Nächte: gleichmäßig; Rest an die Orte mit höchstem Score.
  //    Städte höchstens 3 Nächte, Strand-Endstopp mindestens 4.

  // 5. Plausibilität: Reisezeit unterwegs > 15 % der wachen Stunden (16 h/Tag)
  //    → Stopp mit längstem Anfahrtsweg streichen, Nächte neu verteilen.
  return stops;
}
```

Bei höchstens 6 Stopps reicht „nächster Nachbar"; wer es genau will, probiert alle Reihenfolgen durch (6! = 720, im Browser sofort fertig).

### 9.5 Verkehrsmittel (`transport.ts`)

```ts
export type TransportKind = 'flug' | 'zug' | 'bus' | 'faehre' | 'auto';
export interface TransportOption { kind: TransportKind; label: string; hours: number; note: string; recommended: boolean }

export function transportOptions(a: Place, b: Place, style: Style): TransportOption[];
```

Regeln (Luftlinie `d` in km, Straßenstrecke `g = d · 1,3`):

| Verkehrsmittel | Bedingung | Dauer in h |
| --- | --- | --- |
| Flug | beide mit Flughafen und d > 200 | d / 700 + 2,5 |
| Zug | beide mit Bahn, keine Insel, gleiches Land oder beide in Europa | g / 80 (Europa) bzw. g / 55; über 8 h = „Nachtzug" |
| Fähre / Bus + Fähre | einer ist Insel und d < 400 | g / 40 + 1,5 |
| Bus / Minivan | keine Insel | g / 50 + 0,5; über 8 h = „Nachtbus" |
| Mietwagen (Europa, Südamerika) / Privatfahrer (Südostasien) | keine Insel und g < 450 | g / 65 |
| Flug mit Umstieg | wenn sonst nichts möglich | d / 700 + 4 |

**Empfehlung:** schnellste Bodenverbindung bis 7 h, sonst Flug. Reisestil verschiebt: Budget bevorzugt Bus/Bahn bis 10 h, Luxus bevorzugt Privattransfer bis 5 h, sonst Flug.

Diese Zeiten sind Schätzungen aus der Luftlinie. In der Oberfläche immer mit „ca." anzeigen und im PDF den Hinweis „Fahrzeiten sind grobe Schätzungen" drucken.

### 9.6 Tagesablauf

Aus Stopps und Strecken wird eine flache Liste erzeugt: Stopp („Tag 1–3", Nächte, Programm, Wetter) → Strecke („Tag 4", Verkehrsmittel, Dauer) → … → „Rückreise ab letztem Ort". Reisetage zählen zum Ankunftsort. Dieselbe Liste speist Bildschirm-Zeitleiste und PDF-Tabelle.

---

## 10. Karte

**Bildschirm (`TripMap.tsx`):** Leaflet mit OpenStreetMap-Kacheln.

- Nummerierte Marker (`L.divIcon`, grüner Kreis mit Zahl), Ortsname als Tooltip dauerhaft sichtbar.
- Linien je Strecke: Land = durchgezogen grün, Flug = gestrichelt orange und als Bogen (Zwischenpunkte auf einer Kurve), Fähre = gepunktet blau.
- `map.fitBounds()` auf alle Stopps mit 40 px Rand; bei Änderung der Stopps neu einpassen.
- Pflicht: Quellenangabe „© OpenStreetMap-Mitwirkende" sichtbar lassen. Die öffentlichen OSM-Kachelserver sind nur für geringe Last gedacht; bei mehr Nutzern auf einen Kachel-Anbieter mit Vertrag wechseln (z. B. MapTiler, Stadia) – die Kachel-URL liegt deshalb in einer Konfig-Variable.
- Leaflet-CSS lokal einbinden, nicht von einem fremden CDN laden.

**PDF (`TripMapStatic.tsx`):** Kacheln lassen sich schlecht drucken. Für das PDF eine reine SVG-Karte:

- Projektion wie im Mockup (`buildMap()`): Stopps in einen 640 × 440-Rahmen einpassen, Längen-/Breitengrade linear umrechnen.
- Hintergrund: vereinfachte Küstenlinien aus Natural Earth (110m, gemeinfrei) als GeoJSON, mit derselben Projektion als `<path>` gezeichnet. Datei einmalig mit mapshaper auf wenige hundert KB verkleinern.
- Darüber Linien, Marker, Namen. Ergebnis ist ein scharfes Vektorbild im PDF.

---

## 11. PDF-Export

**Stufe 1 (MVP): Druckansicht.** Route `#/plan/druck` rendert die A4-Seite; ein Button ruft `window.print()` auf, der Nutzer wählt „Als PDF sichern".

```css
/* styles/print.css */
@page { size: A4; margin: 0; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff; }
  .sheet { width: 210mm; min-height: 297mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }  /* Farben der Ampel drucken */
  tr, .stop { break-inside: avoid; }
}
```

- Bei mehr als etwa 8 Stopps läuft die Tabelle auf eine zweite Seite; `thead { display: table-header-group; }` wiederholt die Kopfzeile.
- Vorteil: Vektor-PDF, auswählbarer Text, kaum Code. Nachteil: Der Nutzer muss im Druckdialog „PDF" wählen; auf dem Handy ist das zwei Tipps mehr.

**Stufe 2: Ein-Klick-Download.** `jsPDF` + `html2canvas` rendern die `.sheet` zu einem PDF und laden es als `Reiseplan_Thailand_März.pdf` herunter. Beide Bibliotheken erst beim Klick nachladen (`import()`), damit die Startseite schnell bleibt.

**Senden:** `navigator.share({ title, text, url })` mit dem Plan-Link, wo verfügbar (Handy). Sonst „Link kopieren" und ein `mailto:`-Link mit Betreff und Plan-Link. Eine PDF-Datei direkt per Web Share zu verschicken geht nur mit Stufe 2 (`navigator.canShare({ files })` prüfen).

---

## 12. Barrierefreiheit und Performance

- Tastatur: alle Kacheln, Chips und Monatszellen per Tab erreichbar; Monatsleiste mit Pfeiltasten (Roving Tabindex).
- Screenreader: Monatszellen mit `aria-label="März: Beste Zeit"`; Vorlieben mit `aria-pressed`; Ergebniszahl in einer `aria-live="polite"`-Region.
- Ziel: Lighthouse-Werte über 90 in allen Kategorien; Start-Bundle unter 200 KB gzip. Leaflet, PDF-Bibliotheken und Planer-Seite per `React.lazy` nachladen.
- Datenmenge: 60 Länder und 300–500 Orte sind als JSON etwa 150–300 KB; Bewertung aller Orte dauert wenige Millisekunden.

---

## 13. Recht und Datenschutz (Deutschland)

Keine Rechtsberatung – Punkte, die vor dem Livegang geklärt sein sollten:

- **Impressum und Datenschutzerklärung** als eigene Seiten.
- **Schriften selbst hosten** (`public/fonts/`), nicht von Google Fonts laden – dabei würden IP-Adressen an Google übertragen.
- **Kartenkacheln:** Beim Laden gehen IP-Adressen an den Kachel-Anbieter. In der Datenschutzerklärung nennen; alternativ Karte erst nach Klick laden („Karte anzeigen").
- **localStorage** nur für den eigenen Reiseplan (technisch notwendig) – kein Cookie-Banner nötig, solange kein Tracking eingebaut wird.
- **Reise- und Sicherheitshinweise:** deutlicher Hinweis, dass die App nur Klimadurchschnitte zeigt, und Link zum Auswärtigen Amt.
- **Bilder und Kartendaten:** Lizenzen dokumentieren (OSM-Namensnennung, Natural Earth gemeinfrei).

---

## 14. Deployment (All-Inkl)

1. Subdomain anlegen, z. B. `reisezeit.stuttgartapps.de`, mit eigenem Ordner und FTP-Zugang.
2. `vite.config.ts`: `base: './'` setzen, damit alle Pfade relativ sind.
3. `npm run build` → Inhalt von `dist/` per FTP in den Subdomain-Ordner laden.
4. Durch den HashRouter sind keine Server-Regeln nötig. Optional `.htaccess` für Komprimierung und Caching:

```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
```

5. **HTTPS ist Voraussetzung** für „Link kopieren" (`navigator.clipboard`), Web Share und eine spätere installierbare App (PWA). Ohne SSL-Zertifikat funktionieren diese Funktionen im Browser nicht – vor dem Livegang klären, ob das Hosting-Paket ein Zertifikat für die Subdomain hergibt.
6. Später: Upload automatisieren (GitHub Action mit FTP-Deploy bei Push auf `main`).

---

## 15. Tests und Abnahme

**Unit-Tests (Vitest, `domain/`)**

| Test | Erwartung |
| --- | --- |
| `ranges()` | „Nov–Feb", „Nov–Mär", „Jun–Sep", „ganzjährig", „–" |
| `aggregate()` | Thailand hat in jedem Monat mindestens L (Golf vs. Andamanensee) – Ausnahme laut Daten prüfen |
| Filter Regenzeit | Koh Lanta im Juli fällt raus; Uyuni im Februar bleibt wegen Spiegeleffekt-Event |
| Score Beispiel 1 | Paar, März, 14 Tage, Komfort, Strand + Ruhe + Unterkünfte → Koh Lanta **84** (W 100, P 88, A 60, B 100, F 50, E 0) |
| Score Beispiel 2 | Solo, Juli, 10 Tage, Budget, Europa, Berge + Natur + Abenteuer → Bled **87**, Färöer 81, Dolomiten 77 |
| Vielfalt | höchstens 2 Orte je Land in den Top 6 |
| Route | 14 Tage, ausgewogen → 4 Stopps, Summe Nächte = 13, alle Stopps im 900-km-Umkreis |
| Verkehr | Galápagos ↔ Quito: nur Flug; Bangkok ↔ Chiang Mai: Flug, Nachtzug, Nachtbus |
| Plan-Link | kodieren → dekodieren ergibt denselben Plan |

Die Score-Erwartungen gelten für die Beispieldaten aus dem Algorithmus-Konzept; die Testdaten dafür als feste Fixture ablegen, damit spätere Datenpflege die Tests nicht bricht.

**Daten-Check (`npm run check:data`):** jeder Klima-Code genau 12 Zeichen aus G/L/Y/R; `crowd` 12 Ziffern 0–3; jede `regionId`/`countryId` existiert; Koordinaten plausibel; keine doppelten IDs. Läuft vor jedem Build.

**Durchlauf-Test (Playwright):** Start → Monat März → Thailand öffnen → „Reise hierhin planen" → 3 Vorlieben → „Route automatisch vorschlagen" → Verkehrsmittel ändern → Reiseplan zeigt Karte und Tagesablauf → Druckansicht lädt.

**Abnahme-Kriterien MVP**

- [ ] Startseite filtert nach Suche, Kontinent und Monat; Zähler stimmt
- [ ] Länderdetail zeigt je Region 12 Monate; Klick erklärt den Monat
- [ ] Planer: Vorschläge ändern sich bei jeder Eingabe; jeder Vorschlag hat eine Begründung
- [ ] Automatische Route erzeugt 2–6 Stopps passend zu Dauer und Tempo
- [ ] Verkehrsmittel je Strecke wählbar; Auswahl bleibt nach Neuladen erhalten
- [ ] Karte zeigt nummerierte Stopps und unterscheidbare Linien
- [ ] PDF passt bei bis zu 6 Stopps auf eine A4-Seite, Ampelfarben werden gedruckt
- [ ] Plan-Link öffnet denselben Plan auf einem anderen Gerät
- [ ] Bedienbar auf 360 px Breite und nur mit Tastatur

---

## 16. Arbeitspakete und Reihenfolge

Aufwand als grobe Schätzung für eine Person mit Coding-Agent; Reihenfolge so, dass nach jedem Paket etwas Benutzbares online steht.

| Nr. | Paket | Inhalt | Ergebnis | Aufwand |
| --- | --- | --- | --- | --- |
| 1 | Grundgerüst | Vite + React + TS, Router, Tokens, Schriften, Layout, Deploy-Test auf Subdomain | leere App online | 0,5 Tage |
| 2 | Daten | Zod-Schema, Übernahme aus Mockup, `check:data` | `countries.json`, `places.json` geprüft | 1 Tag |
| 3 | Übersicht | Startseite, Länderkachel, Monatsleiste, Suche, Filter, Länderdetail | Teil 1 der App nutzbar | 2 Tage |
| 4 | Domain-Logik | `climate`, `filter`, `score`, `transport`, `route` mit Tests | Algorithmus grün getestet | 2 Tage |
| 5 | Planer Schritte 1–3 | Store, Vorlieben, Vorschläge, Stopp-Liste, Verkehrsmittel | Route planbar | 2 Tage |
| 6 | Reiseplan + Karte | Kennzahlen, Warnungen, Zeitleiste, Leaflet-Karte | Schritt 4 fertig | 1,5 Tage |
| 7 | PDF + Teilen | Druckseite, SVG-Karte, Plan-Link, Web Share | Plan versendbar | 1,5 Tage |
| 8 | Feinschliff | Barrierefreiheit, leere Zustände, Ladezeiten, Impressum/Datenschutz, Durchlauf-Test | Version 1.0 | 1,5 Tage |

Summe: rund 12 Arbeitstage. Der größte Unsicherheitsfaktor ist nicht der Code, sondern die Datenpflege (Paket 2 laufend fortsetzen).

**Empfohlene erste Sitzung mit dem Coding-Agenten:** Dieses Dokument und die Mockup-Dateien ins Repository legen (`docs/`), dann Paket 1 und 2 beauftragen: „Lies `docs/implementierungskonzept.md`. Setze Abschnitt 3 (Struktur) und 4 (Datenmodell) um, wandle die Mockup-Daten in JSON um und schreibe `check:data`."

### Offene Punkte

- [ ] Klimadaten-Quelle zur Prüfung der Codes auswählen (Lizenz klären)
- [ ] Wer pflegt `crowd`, `priceLevel` und Vorlieben-Stärken für alle Orte?
- [ ] Sicherheitsstufe: von Hand pflegen oder Reisewarnungen des Auswärtigen Amts automatisch abrufen (dann wäre ein kleiner Server-Baustein oder Build-Schritt nötig)
- [ ] HTTPS für die Subdomain
- [ ] Afrika und restliches Asien in den Planer aufnehmen (im Mockup nur Südostasien, Südamerika, Europa)
- [ ] Name und Domain der App endgültig festlegen
- [ ] Geschäftsmodell: Unterkunfts-Links mit Provision? Hätte Folgen für Datenschutz und Kennzeichnung

### Ausblick nach 1.0

- Installierbare App (PWA) mit Offline-Daten
- Zeitraum-Suche („wann ist mein Traumziel am besten?")
- Echte Fahrzeiten über eine Routing-Schnittstelle
- Nutzerkonten und gespeicherte Reisen (dann mit Backend, z. B. Supabase)
- Lernen aus Nutzerverhalten laut Algorithmus-Konzept, Stufe 2 und 3
