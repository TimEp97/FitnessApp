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

Auf dem iPhone: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Wichtig: Die installierte App und Safari haben getrennte Speicher. Am besten direkt die installierte App nutzen; nach dem Anmelden kommen die Daten vom Server.

### Hosting bei all-inkl mit Konten und Server-Sicherung

Jede Person meldet sich mit eigenem Konto an. Die App speichert alles zuerst im Browser (IndexedDB, eine eigene Datenbank pro Konto) und sichert jede Änderung automatisch per PHP in einer MySQL-Datenbank auf dem eigenen Webspace. So bleibt die Historie erhalten, auch wenn der Browser-Speicher gelöscht wird oder das Gerät wechselt. PHP und MySQL sind in jedem all-inkl-Tarif enthalten.

1. Im KAS unter „Datenbanken“ eine MySQL-Datenbank anlegen.
2. Im KAS unter „Domain“ SSL (Let’s Encrypt) aktivieren und PHP ab 8.0 einstellen.
3. `npm run build` ausführen und den **Inhalt** von `dist/` per FTP hochladen (z. B. nach `/athletic/`). Der Ordner `api/` mit `auth.php`, `sync.php`, `_lib.php` und `.htaccess` gehört dazu.
4. `api/config.example.php` als `api/config.php` kopieren und eintragen: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` aus dem KAS und einen frei gewählten `SETUP_CODE` (mindestens 12 Zeichen). Optional `MAIL_FROM` für „Passwort vergessen“.
5. Die App öffnen: Sie fragt nach dem Einrichtungscode und legt das erste Konto als Admin an. Die Tabellen entstehen dabei automatisch.
6. Weitere Personen lädst du im Profil unter „Nutzer und Einladungen“ mit einem Einladungscode ein.

Was auf dem Server passiert:

- Der aktuelle Stand jedes Kontos liegt in der Tabelle `athletic_user_state`, pro Tag entsteht eine Kopie in `athletic_user_history` (die letzten 90 Tage). So lässt sich jeder frühere Stand wiederherstellen.
- Gesichert wird automatisch: Sätze und Workouts nach 0,3 Sekunden, andere Änderungen nach 1,5 Sekunden, außerdem beim Wechsel in eine andere App und beim Öffnen. Was beim Schließen noch nicht auf dem Server war, liegt sicher im Browser und wird beim nächsten Öffnen nachgeholt.
- Ohne Netz arbeitet die App normal weiter und holt die Sicherung nach, sobald wieder eine Verbindung besteht.
- Nutzt ein Konto mehrere Geräte, werden die Stände zusammengeführt: je Datensatz gewinnt die neuere Änderung, Löschungen werden übertragen.
- Ohne Anmeldung gibt `sync.php` nichts heraus. `config.php` und `_lib.php` sind per `.htaccess` gesperrt und liefern auch bei direktem Aufruf keine Inhalte. http wird auf https umgeleitet.
- Bei einem neuen Upload `api/config.php` **nicht** überschreiben.

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
| Server | `public/api/` (PHP 8, MySQL/MariaDB; Tests mit SQLite): Konten in `auth.php`, Sicherung in `sync.php`; Abgleich in `src/sync` |
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
- **Sync zwischen Geräten** läuft über das eigene Konto auf dem eigenen Webspace.
- **HealthKit, Apple Watch, Widgets, Live Activities** erscheinen im Profil als „Spätere Ausbaustufe“.
