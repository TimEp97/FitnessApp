# ATHLETIC

Fitness-Tracking für Krafttraining als Web-App. Mobile-first, offline nutzbar und auf dem iPhone als PWA installierbar. Die Daten liegen im Browser (IndexedDB) und auf Wunsch zusätzlich auf dem eigenen Webspace (PHP-Datei `api/sync.php`, z. B. bei all-inkl). Es gibt kein Konto und keine Dienste Dritter.

## Schnellstart

```bash
npm install
npm run dev          # Entwicklungsserver auf http://localhost:5173
npm test             # Unit-Tests (Vitest)
npm run test:e2e     # End-to-End-Tests (Playwright, baut vorher)
npm run build        # statischer Build nach dist/
npm run preview      # Build lokal ansehen
npm run build:preview  # Vorschau als einzelne Datei preview/athletic.html (ohne Service Worker und Sync)
```

## Deployment

`npm run build` erzeugt in `dist/` eine rein statische Seite. Den Ordnerinhalt auf einen beliebigen Webspace mit HTTPS kopieren, fertig. Die App nutzt relative Pfade und Hash-Routing (`#/training`), daher braucht der Server keine Rewrite-Regeln und die App läuft auch in einem Unterverzeichnis. HTTPS ist nötig, damit Service Worker (Offline-Betrieb) und Installation als PWA funktionieren.

Auf dem iPhone: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Wichtig: Die installierte App und Safari haben getrennte Speicher. Am besten direkt die installierte App nutzen und die Server-Sicherung einrichten.

### Hosting bei all-inkl mit Server-Sicherung

Damit die Historie dauerhaft erhalten bleibt (auch wenn der Browser-Speicher gelöscht wird oder das Gerät wechselt), sichert die App jede Änderung automatisch auf dem eigenen Webspace. Dafür reicht PHP, das in jedem all-inkl-Tarif enthalten ist. Optional landen die Daten in einer MySQL-Datenbank, ohne Datenbank in einer JSON-Datei.

1. `npm run build` ausführen und den **Inhalt** von `dist/` per FTP in das Zielverzeichnis der Domain laden (z. B. `/athletic/`). Der Ordner `api/` mit `sync.php` und `.htaccess` gehört dazu.
2. Im KAS unter „Domain“ SSL (Let’s Encrypt) für die Domain aktivieren und eine PHP-Version ab 8.0 einstellen.
3. Die App öffnen → Profil → „Speicherung und Sicherung“ → **Neuen Schlüssel erzeugen**. Den angezeigten Inhalt als Datei `api/config.php` auf den Webspace laden (Vorlage: `api/config.example.php`). Für die Datenbank dort zusätzlich `DB_NAME`, `DB_USER` und `DB_PASS` aus dem KAS (Datenbanken) eintragen; die Tabellen legt `sync.php` beim ersten Aufruf selbst an.
4. In der App **Verbinden** tippen. Ab jetzt wird jede Änderung nach wenigen Sekunden gesichert, außerdem beim Schließen und beim Öffnen der App.
5. Auf weiteren Geräten denselben Schlüssel eingeben und „Serverdaten übernehmen“ wählen.

Was auf dem Server passiert:

- Mit Datenbank liegt der aktuelle Stand in der Tabelle `athletic_state`, pro Tag entsteht eine Kopie in `athletic_history` (die letzten 90 Tage). Ohne Datenbank liegen sie in `api/data/athletic.json` und `api/data/history/`. So lässt sich jeder frühere Stand wiederherstellen.
- `api/data/` und `config.php` sind per `.htaccess` gegen direkten Abruf gesperrt. Zugriff gibt es nur über `sync.php` mit dem geheimen Schlüssel.
- Ohne Netz arbeitet die App normal weiter und holt die Sicherung nach, sobald wieder eine Verbindung besteht.
- Ändern zwei Geräte gleichzeitig, werden die Stände zusammengeführt: je Datensatz gewinnt die neuere Änderung, Löschungen werden übertragen.
- Bei einem neuen Upload `api/config.php` und `api/data/` **nicht** löschen oder überschreiben.

Zusätzlich fordert die App beim Start dauerhaften Browser-Speicher an, damit der Browser die Daten nicht bei Speicherknappheit entfernt. Der Status steht im Profil.

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
| Server-Sicherung | `public/api/sync.php` (PHP 8, ohne Datenbank), Abgleich in `src/sync` |
| Tests | Vitest (`src/**/*.test.ts`), Playwright (`e2e/`, läuft gegen einen PHP-Server wie bei all-inkl) |

## Aufbau

```
src/
  types.ts              Datenmodell
  data/                 Übungsbibliothek (57 Übungen), Piktogramme, Planvorlagen, Beschriftungen
  db/                   Dexie-Datenbank, Beispieldaten
  logic/                reine Logik: Kennzahlen, Rekorde, Streak, Muskelbelastung,
                        Gewichts- und Übungsvorschläge, Planung, Sicherung
  stores/               Zustand-Stores (Einstellungen, Übungen, Pläne, Workouts, Körperwerte)
  sync/                 Änderungsverfolgung, Zusammenführen, Abgleich mit api/sync.php
  components/           Tab-Leiste, Muskelkarte, Satz-Eingabe, Pausen-Timer, Diagramme …
  pages/                Screens: Home, Training, Plan bearbeiten, Workout, Zusammenfassung,
                        Muskeln, Fortschritt, Übungen, Übungsdetail, Profil, Onboarding
e2e/                    Playwright-Tests der Kernabläufe und der Server-Sicherung
public/api/             sync.php, config.example.php, .htaccess für den Webspace
```

## Umsetzungsentscheidungen

- **Nur Handy-Layout**: eine Spalte, Tab-Leiste unten. Auf Tablet und Desktop erscheint dieselbe Ansicht in Handybreite (480 px) mittig.
- **Notbetrieb**: Verweigert der Browser IndexedDB (z. B. privates Surfen), läuft die App im Arbeitsspeicher weiter und weist darauf hin.
- **Hash-Routing** statt History-Routing, damit der Build ohne Serverkonfiguration auf jedem Webspace läuft.
- **Beispieldaten** sind mit `sample: true` markiert. „Beispieldaten entfernen“ löscht nur diese Workouts und Körperwerte, eigene Einträge bleiben. Die Beispielpläne werden auf Nachfrage behalten oder entfernt.
- **Laufendes Workout**: Der Bedienzustand (aktuelle Übung, Pause, Pausen-Timer) liegt im Feld `cursor` des Workouts und wird nach jeder Änderung gespeichert. Nach einem Neustart geht es an derselben Stelle weiter.
- **Rekorde und Statistiken** werden immer aus den Workouts berechnet und nicht gespeichert.
- **Schwellen der Muskelkarte** stehen als Konstanten in `src/logic/muscleLoad.ts` (`LOAD_THRESHOLDS`).
- **Einheiten**: Kilogramm und Zentimeter. Eine Umstellung auf Pfund ist nicht umgesetzt.
- **Kalorien** werden bewusst nicht angezeigt.
- **Bilder**: Jede Übung hat ein eigenes Piktogramm (SVG, `src/data/illustrations.ts`), das in Bibliothek, Workout, Plänen und auf Home erscheint. Eine echte Grafik lässt sich über das Feld `illustration` hinterlegen und hat dann Vorrang.
- **App-Symbol**: Kurzhantel in Lime auf Schwarz, erzeugt mit `npm run icons`.
- Kein Tracking. Anfragen gehen nur an die eigene Domain (App laden, optional `api/sync.php`).

## Offene Punkte

- **Illustrationen**: Die Übungen haben Piktogramme. Fotos oder detaillierte Zeichnungen und eine anatomisch genaue Körperfigur fehlen noch; sie können über das Feld `illustration` eingebunden werden.
- **Schwellen der Muskelbelastung** (unter 4, 4 bis 12, über 12 bis 18, über 18 Sätze pro Woche) sind Startwerte und sollten vor der Veröffentlichung fachlich geprüft werden.
- **Sync zwischen Geräten** läuft über die eigene Server-Sicherung mit einem gemeinsamen Schlüssel (ein Nutzer). Mehrere Nutzer mit eigenen Konten sind nicht vorgesehen.
- **HealthKit, Apple Watch, Widgets, Live Activities** erscheinen im Profil als „Spätere Ausbaustufe“.
