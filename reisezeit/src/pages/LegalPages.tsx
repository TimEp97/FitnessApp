import { SiteHeader } from '../App';

// Platzhalter: Angaben vor dem Livegang ausfüllen und rechtlich prüfen lassen (keine Rechtsberatung).

export function ImpressumPage() {
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap prose" style={{ paddingTop: 24 }}>
        <h1>Impressum</h1>
        <p><strong>Angaben gemäß § 5 DDG</strong></p>
        <p>[NAME]<br />[STRASSE NR.]<br />[PLZ ORT]</p>
        <p>E-Mail: [E-MAIL]</p>
        <h2>Haftung für Inhalte</h2>
        <p>
          Die Reisezeiten sind klimatische Durchschnittswerte und ersetzen keine aktuelle Wetter- oder Sicherheitsauskunft.
          Fahrzeiten im Reiseplaner sind grobe Schätzungen aus der Luftlinie. Vor jeder Reise die Reise- und
          Sicherheitshinweise des Auswärtigen Amts prüfen.
        </p>
        <h2>Bild- und Kartennachweise</h2>
        <ul>
          <li>Landschafts-Illustrationen: eigene Grafiken.</li>
          <li>Kartendaten der interaktiven Karte: © OpenStreetMap-Mitwirkende (ODbL).</li>
          <li>Küstenlinien der Druckkarte: Natural Earth (gemeinfrei), über das Paket „world-atlas“.</li>
          <li>Schriften: Inter und Space Grotesk (SIL Open Font License), selbst gehostet.</li>
          <li>Symbole: Lucide (ISC-Lizenz).</li>
        </ul>
      </main>
    </>
  );
}

export function DatenschutzPage() {
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap prose" style={{ paddingTop: 24 }}>
        <h1>Datenschutzerklärung</h1>
        <h2>Verantwortlich</h2>
        <p>[NAME, ANSCHRIFT, E-MAIL – siehe Impressum]</p>
        <h2>Hosting</h2>
        <p>
          Die Seite liegt bei [HOSTER]. Beim Aufruf verarbeitet der Server technisch notwendige Daten (z. B. IP-Adresse,
          Uhrzeit, aufgerufene Datei) in Server-Logdateien. Grundlage ist Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <h2>Speicherung im Browser</h2>
        <p>
          Dein Reiseplan (Vorlieben, Stopps, Verkehrsmittel) wird nur lokal in deinem Browser (localStorage) gespeichert,
          damit er nach dem Neuladen noch da ist. Es gibt keine Konten, kein Tracking und keine Cookies.
          Du kannst die Daten jederzeit über die Browser-Einstellungen oder im Planer mit „Neu anfangen“ löschen.
        </p>
        <h2>Karte (OpenStreetMap)</h2>
        <p>
          Die interaktive Karte wird erst geladen, wenn du auf „Karte laden“ tippst. Dann ruft dein Browser Kartenkacheln
          von den Servern der OpenStreetMap Foundation ab; dabei wird deine IP-Adresse übertragen. Siehe
          {' '}<a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">Datenschutzerklärung der OSMF</a>.
          Ohne Zustimmung zeigt der Planer eine Karte, die vollständig von dieser Seite kommt.
        </p>
        <h2>Schriften</h2>
        <p>Alle Schriften liegen auf diesem Server. Es werden keine Daten an Google oder andere Schriften-Dienste übertragen.</p>
        <h2>Teilen</h2>
        <p>
          Beim Teilen wird dein Plan als kurzer Text in den Link geschrieben (z. B. Monat, Orte, Nächte). Dieser Link wird
          nicht an uns übertragen, sondern nur an die Personen, denen du ihn schickst.
        </p>
        <h2>Deine Rechte</h2>
        <p>Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Beschwerde bei einer Aufsichtsbehörde (Art. 15–21, 77 DSGVO).</p>
      </main>
    </>
  );
}
