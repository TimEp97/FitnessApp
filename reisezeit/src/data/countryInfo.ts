// Einreise-Infos für deutsche Staatsangehörige (touristische Reisen).
// WICHTIG: von Hand gepflegte Kurzfassung, Stand siehe INFO_STAND. Einreiseregeln ändern sich oft –
// verbindlich sind nur die Angaben des Auswärtigen Amts und der Botschaft des Reiselands.
// Vor dem Livegang und danach regelmäßig Land für Land gegen das Auswärtige Amt prüfen.

export const INFO_STAND = 'Mitte 2026';
export const AA_URL = 'https://www.auswaertiges-amt.de/de/ReiseUndSicherheit/reise-und-sicherheitshinweise';

/** frei = ohne Visum · eu = EU/Schengen-Freizügigkeit · online = vorab online beantragen · ankunft = Visum bei Ankunft · visum = Visum vorab */
export type VisaKind = 'eu' | 'frei' | 'online' | 'ankunft' | 'visum';

export interface CountryInfo {
  visa: VisaKind;
  /** Kurztext zum Visum */
  visaText: string;
  /** Erlaubter Aufenthalt als Tourist */
  stay: string;
  /** Reisedokument */
  doc: string;
  currency: string;
  /** Zeitverschiebung zu Deutschland */
  time: string;
  note?: string;
}

export const VISA_LABEL: Record<VisaKind, string> = {
  eu: 'Kein Visum (EU / Schengen)',
  frei: 'Visumfrei',
  online: 'Online-Genehmigung vorab',
  ankunft: 'Visum bei Ankunft',
  visum: 'Visum vorab nötig',
};

const PASS6 = 'Reisepass, noch mind. 6 Monate gültig';
const PASS = 'Reisepass';
const ID = 'Personalausweis oder Reisepass';

export const COUNTRY_INFO: Record<string, CountryInfo> = {
  // ---------------------------------------------------------------- Südostasien
  th: { visa: 'frei', visaText: 'Kein Visum nötig. Digitale Einreisekarte (TDAC) vor der Ankunft ausfüllen.', stay: 'bis 60 Tage', doc: PASS6, currency: 'Thailändischer Baht (THB)', time: '+6 h (Sommerzeit: +5 h)', note: 'Eine Verkürzung auf 30 Tage ist im Gespräch – vor der Reise prüfen.' },
  vn: { visa: 'frei', visaText: 'Kein Visum nötig. Für längere Aufenthalte E-Visum (bis 90 Tage).', stay: 'bis 45 Tage', doc: PASS6, currency: 'Vietnamesischer Dong (VND)', time: '+6 h (Sommerzeit: +5 h)' },
  kh: { visa: 'ankunft', visaText: 'Visum nötig: als E-Visum vorab oder bei Ankunft (ca. 30 USD). Digitale Einreisekarte (e-Arrival).', stay: '30 Tage', doc: PASS6, currency: 'Riel (KHR), US-Dollar üblich', time: '+6 h (Sommerzeit: +5 h)' },
  la: { visa: 'ankunft', visaText: 'Visum nötig: als E-Visum vorab oder bei Ankunft an den großen Grenzübergängen.', stay: '30 Tage', doc: PASS6, currency: 'Kip (LAK)', time: '+6 h (Sommerzeit: +5 h)' },
  my: { visa: 'frei', visaText: 'Kein Visum nötig. Digitale Einreisekarte (MDAC) innerhalb von 3 Tagen vor Ankunft.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Ringgit (MYR)', time: '+7 h (Sommerzeit: +6 h)' },
  sg: { visa: 'frei', visaText: 'Kein Visum nötig. SG Arrival Card online innerhalb von 3 Tagen vor Ankunft.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Singapur-Dollar (SGD)', time: '+7 h (Sommerzeit: +6 h)' },
  id: { visa: 'ankunft', visaText: 'Visum bei Ankunft oder vorab als e-VOA (kostenpflichtig). Auf Bali zusätzlich Touristenabgabe.', stay: '30 Tage, einmal um 30 Tage verlängerbar', doc: PASS6, currency: 'Rupiah (IDR)', time: '+6 bis +8 h je nach Insel (Bali +7 h; Sommerzeit: 1 h weniger)' },
  ph: { visa: 'frei', visaText: 'Kein Visum nötig. Online-Registrierung „eTravel“ vor Ankunft, Rück- oder Weiterflugticket.', stay: 'bis 30 Tage', doc: PASS6, currency: 'Philippinischer Peso (PHP)', time: '+7 h (Sommerzeit: +6 h)' },
  // ---------------------------------------------------------------- Ostasien
  jp: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage', doc: 'Reisepass, gültig für die Dauer des Aufenthalts', currency: 'Yen (JPY)', time: '+8 h (Sommerzeit: +7 h)' },
  kr: { visa: 'frei', visaText: 'Kein Visum nötig. Die Online-Genehmigung K-ETA war für Deutsche zuletzt ausgesetzt – aktuellen Stand prüfen.', stay: 'bis 90 Tage', doc: PASS, currency: 'Won (KRW)', time: '+8 h (Sommerzeit: +7 h)' },
  cn: { visa: 'frei', visaText: 'Derzeit visumfrei (einseitige, befristete Regelung Chinas). Tibet nur mit Sondergenehmigung über einen Veranstalter. Hongkong und Macau: eigene Regeln, bis 90 Tage visumfrei.', stay: 'bis 30 Tage', doc: PASS6, currency: 'Renminbi Yuan (CNY)', time: '+7 h (Sommerzeit: +6 h)', note: 'Die Befreiung ist befristet – vor der Buchung prüfen, ob sie noch gilt.' },
  tw: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Neuer Taiwan-Dollar (TWD)', time: '+7 h (Sommerzeit: +6 h)' },
  mn: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 30 Tage', doc: PASS6, currency: 'Tugrik (MNT)', time: '+7 h (Sommerzeit: +6 h)' },
  // ---------------------------------------------------------------- Südasien
  in: { visa: 'online', visaText: 'E-Visum vorab online beantragen (mind. 4 Tage vor Abreise). Für Sikkim, Ladakh-Grenzgebiete und Andamanen teils Sondergenehmigungen.', stay: '30 Tage (auch 1- und 5-Jahres-E-Visum)', doc: PASS6, currency: 'Indische Rupie (INR)', time: '+4,5 h (Sommerzeit: +3,5 h)' },
  lk: { visa: 'online', visaText: 'Elektronische Reisegenehmigung (ETA) vorab online beantragen.', stay: '30 Tage, verlängerbar', doc: PASS6, currency: 'Sri-Lanka-Rupie (LKR)', time: '+4,5 h (Sommerzeit: +3,5 h)' },
  mv: { visa: 'ankunft', visaText: 'Kostenloses Visum bei Ankunft. Online-Erklärung „IMUGA“ innerhalb von 96 Stunden vor der Ein- und Ausreise.', stay: '30 Tage', doc: 'Reisepass, noch mind. 1 Monat gültig', currency: 'Rufiyaa (MVR), US-Dollar üblich', time: '+4 h (Sommerzeit: +3 h)' },
  np: { visa: 'ankunft', visaText: 'Visum bei Ankunft (15, 30 oder 90 Tage, kostenpflichtig) oder vorab online. Trekking-Genehmigungen extra.', stay: '15 / 30 / 90 Tage', doc: PASS6, currency: 'Nepalesische Rupie (NPR)', time: '+4:45 h (Sommerzeit: +3:45 h)' },
  bt: { visa: 'visum', visaText: 'Visum vorab online oder über einen Veranstalter. Zusätzlich Tagesabgabe (Sustainable Development Fee, derzeit 100 USD pro Nacht).', stay: 'laut Visum', doc: PASS6, currency: 'Ngultrum (BTN)', time: '+5 h (Sommerzeit: +4 h)' },
  bd: { visa: 'visum', visaText: 'Visum nötig – vorab bei der Botschaft; Visum bei Ankunft nur unter Bedingungen.', stay: 'meist 30 Tage', doc: PASS6, currency: 'Taka (BDT)', time: '+5 h (Sommerzeit: +4 h)' },
  // ---------------------------------------------------------------- Westasien
  ae: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage innerhalb von 180 Tagen', doc: PASS6, currency: 'Dirham (AED)', time: '+3 h (Sommerzeit: +2 h)' },
  om: { visa: 'frei', visaText: 'Kein Visum nötig für Kurzaufenthalte; für längere Reisen E-Visum.', stay: 'bis 14 Tage visumfrei', doc: PASS6, currency: 'Omanischer Rial (OMR)', time: '+3 h (Sommerzeit: +2 h)' },
  qa: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Katar-Riyal (QAR)', time: '+2 h (Sommerzeit: +1 h)' },
  sa: { visa: 'online', visaText: 'Touristenvisum als E-Visum vorab oder bei Ankunft.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Saudi-Riyal (SAR)', time: '+2 h (Sommerzeit: +1 h)' },
  jo: { visa: 'ankunft', visaText: 'Visum bei Ankunft (ca. 40 JOD) oder im „Jordan Pass“ enthalten (ab 3 Nächten).', stay: '30 Tage', doc: PASS6, currency: 'Jordanischer Dinar (JOD)', time: '+2 h (Sommerzeit: +1 h)' },
  tr: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage innerhalb von 180 Tagen', doc: ID, currency: 'Türkische Lira (TRY)', time: '+2 h (Sommerzeit: +1 h)' },
  ge: { visa: 'frei', visaText: 'Georgien und Armenien: kein Visum nötig.', stay: 'Georgien bis 1 Jahr, Armenien bis 180 Tage', doc: PASS, currency: 'Lari (GEL) / Dram (AMD)', time: '+3 h (Sommerzeit: +2 h)', note: 'Für Georgien ist eine Reisekrankenversicherung vorgeschrieben.' },
  uz: { visa: 'frei', visaText: 'Kein Visum nötig. Registrierung über die Unterkunft.', stay: 'bis 30 Tage', doc: PASS, currency: 'So‘m (UZS)', time: '+4 h (Sommerzeit: +3 h)' },
  kg: { visa: 'frei', visaText: 'Kirgistan und Tadschikistan: kein Visum nötig. Für den Pamir Highway zusätzlich die GBAO-Genehmigung.', stay: 'Kirgistan bis 60 Tage, Tadschikistan bis 30 Tage', doc: PASS6, currency: 'Som (KGS) / Somoni (TJS)', time: '+4 bis +5 h (Sommerzeit: 1 h weniger)' },
  // ---------------------------------------------------------------- Nordafrika
  ma: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage', doc: PASS, currency: 'Dirham (MAD)', time: '±0 h (Sommerzeit: −1 h)' },
  tn: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage', doc: 'Reisepass (Personalausweis reicht für Individualreisende nicht mehr)', currency: 'Tunesischer Dinar (TND)', time: '±0 h (Sommerzeit: −1 h)' },
  eg: { visa: 'ankunft', visaText: 'Visum nötig: als E-Visum vorab oder bei Ankunft am Flughafen (ca. 25 USD). Nur Sinai-Badeorte: kostenloser Stempel für 15 Tage.', stay: '30 Tage', doc: PASS6, currency: 'Ägyptisches Pfund (EGP)', time: '+1 h (meist ganzjährig)' },
  // ---------------------------------------------------------------- Ostafrika
  ke: { visa: 'online', visaText: 'Elektronische Reisegenehmigung (eTA) vorab online beantragen – mind. 3 Tage vor Abreise.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Kenia-Schilling (KES)', time: '+2 h (Sommerzeit: +1 h)' },
  tz: { visa: 'online', visaText: 'Visum nötig: als E-Visum vorab (empfohlen) oder bei Ankunft (50 USD). Für Sansibar ist eine staatliche Reiseversicherung Pflicht.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Tansania-Schilling (TZS)', time: '+2 h (Sommerzeit: +1 h)' },
  ug: { visa: 'online', visaText: 'E-Visum vorab online beantragen. Gelbfieber-Impfnachweis erforderlich.', stay: 'bis 90 Tage', doc: PASS6, currency: 'Uganda-Schilling (UGX)', time: '+2 h (Sommerzeit: +1 h)' },
  rw: { visa: 'ankunft', visaText: 'Visum bei Ankunft oder vorab online.', stay: '30 Tage', doc: PASS6, currency: 'Ruanda-Franc (RWF)', time: '+1 h (Sommerzeit: ±0 h)' },
  mg: { visa: 'ankunft', visaText: 'Visum bei Ankunft am Flughafen (30, 60 oder 90 Tage) oder vorab als E-Visum.', stay: '30 / 60 / 90 Tage', doc: PASS6, currency: 'Ariary (MGA)', time: '+2 h (Sommerzeit: +1 h)' },
  mw: { visa: 'online', visaText: 'Regeln haben zuletzt mehrfach gewechselt (visumfrei ↔ E-Visum). Aktuellen Stand unbedingt prüfen.', stay: 'meist 30 Tage', doc: PASS6, currency: 'Malawi-Kwacha (MWK)', time: '+1 h (Sommerzeit: ±0 h)' },
  mz: { visa: 'frei', visaText: 'Für touristische Kurzaufenthalte kein Visum nötig; Online-Voranmeldung und Gebühr bei Einreise.', stay: 'bis 30 Tage', doc: PASS6, currency: 'Metical (MZN)', time: '+1 h (Sommerzeit: ±0 h)' },
  // ---------------------------------------------------------------- Indischer Ozean
  mu: { visa: 'frei', visaText: 'Kein Visum nötig. Rückflugticket und Unterkunftsnachweis.', stay: 'bis 90 Tage', doc: 'Reisepass, gültig für die Dauer des Aufenthalts', currency: 'Mauritius-Rupie (MUR)', time: '+3 h (Sommerzeit: +2 h)' },
  sc: { visa: 'online', visaText: 'Kein Visum, aber kostenpflichtige Online-Reisegenehmigung (Travel Authorisation) vor Abflug.', stay: '30 Tage, verlängerbar', doc: 'Reisepass, gültig für die Dauer des Aufenthalts', currency: 'Seychellen-Rupie (SCR)', time: '+3 h (Sommerzeit: +2 h)' },
  re: { visa: 'eu', visaText: 'Französisches Überseegebiet – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '+3 h (Sommerzeit: +2 h)' },
  // ---------------------------------------------------------------- Südliches Afrika
  za: { visa: 'frei', visaText: 'Kein Visum nötig. Im Pass müssen mind. 2 freie Seiten sein.', stay: 'bis 90 Tage', doc: 'Reisepass, noch mind. 30 Tage über die Ausreise hinaus gültig', currency: 'Rand (ZAR)', time: '+1 h (Sommerzeit: ±0 h)' },
  na: { visa: 'ankunft', visaText: 'Seit April 2025 Visum nötig: bei Ankunft oder vorab online (kostenpflichtig).', stay: 'bis 90 Tage', doc: PASS6, currency: 'Namibia-Dollar (NAD)', time: '+1 h (Sommerzeit: ±0 h)' },
  bw: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage pro Jahr', doc: PASS6, currency: 'Pula (BWP)', time: '+1 h (Sommerzeit: ±0 h)' },
  zw: { visa: 'ankunft', visaText: 'Visum bei Ankunft. Mit dem KAZA-Univisum auch Sambia (Victoriafälle beidseitig).', stay: '30 Tage', doc: PASS6, currency: 'US-Dollar üblich', time: '+1 h (Sommerzeit: ±0 h)' },
  zm: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage pro Jahr', doc: PASS6, currency: 'Kwacha (ZMW)', time: '+1 h (Sommerzeit: ±0 h)' },
  // ---------------------------------------------------------------- Westafrika & Atlantik
  sn: { visa: 'frei', visaText: 'Senegal und Gambia: kein Visum nötig. Gelbfieber-Impfung empfohlen bzw. bei Einreise aus Risikogebieten Pflicht.', stay: 'bis 90 Tage', doc: PASS6, currency: 'CFA-Franc (XOF) / Dalasi (GMD)', time: '−1 h (Sommerzeit: −2 h)' },
  gh: { visa: 'visum', visaText: 'Visum vorab bei der Botschaft beantragen. Gelbfieber-Impfnachweis Pflicht.', stay: 'laut Visum, meist 30–60 Tage', doc: PASS6, currency: 'Cedi (GHS)', time: '−1 h (Sommerzeit: −2 h)' },
  cv: { visa: 'frei', visaText: 'Kein Visum nötig. Online-Vorregistrierung (EASE) und Flughafengebühr vor Ankunft.', stay: 'bis 30 Tage', doc: PASS6, currency: 'Kap-Verde-Escudo (CVE)', time: '−2 h (Sommerzeit: −3 h)' },
  ic: { visa: 'eu', visaText: 'Spanien bzw. Portugal – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '−1 h' },
  // ---------------------------------------------------------------- Südamerika
  pe: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage innerhalb von 180 Tagen', doc: PASS6, currency: 'Sol (PEN)', time: '−6 h (Sommerzeit: −7 h)' },
  bo: { visa: 'frei', visaText: 'Kein Visum nötig. Zunächst 30 Tage, kostenlos verlängerbar.', stay: 'bis 90 Tage pro Jahr', doc: PASS6, currency: 'Boliviano (BOB)', time: '−5 h (Sommerzeit: −6 h)' },
  cl: { visa: 'frei', visaText: 'Kein Visum nötig. Strenge Einfuhrregeln für Lebensmittel.', stay: 'bis 90 Tage', doc: PASS, currency: 'Chilenischer Peso (CLP)', time: '−4 bis −6 h je nach Jahreszeit' },
  ec: { visa: 'frei', visaText: 'Kein Visum nötig. Galápagos: Transitkarte und Nationalparkgebühr (derzeit 200 USD) extra.', stay: 'bis 90 Tage pro Jahr', doc: PASS6, currency: 'US-Dollar (USD)', time: '−6 h (Sommerzeit: −7 h)' },
  ar: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage', doc: PASS, currency: 'Argentinischer Peso (ARS)', time: '−4 h (Sommerzeit: −5 h)' },
  br: { visa: 'frei', visaText: 'Kein Visum nötig.', stay: 'bis 90 Tage innerhalb von 180 Tagen', doc: PASS, currency: 'Real (BRL)', time: '−4 h (Sommerzeit: −5 h)' },
  co: { visa: 'frei', visaText: 'Kein Visum nötig. Online-Formular „Check-Mig“ vor Ein- und Ausreise.', stay: 'bis 90 Tage', doc: PASS, currency: 'Kolumbianischer Peso (COP)', time: '−6 h (Sommerzeit: −7 h)' },
  // ---------------------------------------------------------------- Europa
  is: { visa: 'eu', visaText: 'Schengen-Raum – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Isländische Krone (ISK)', time: '−1 h (Sommerzeit: −2 h)' },
  fo: { visa: 'frei', visaText: 'Kein Visum. Die Färöer gehören zu Dänemark, aber nicht zur EU und nicht zum Schengen-Raum.', stay: 'bis 90 Tage', doc: 'Reisepass empfohlen', currency: 'Färöische / Dänische Krone (DKK)', time: '−1 h' },
  no: { visa: 'eu', visaText: 'Schengen-Raum – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Norwegische Krone (NOK)', time: '±0 h' },
  fi: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '+1 h' },
  gb: { visa: 'online', visaText: 'Elektronische Reisegenehmigung (ETA) vorab online beantragen – gilt 2 Jahre.', stay: 'bis 6 Monate', doc: 'Reisepass (Personalausweis reicht nicht)', currency: 'Pfund Sterling (GBP)', time: '−1 h' },
  ie: { visa: 'eu', visaText: 'EU – kein Visum (nicht im Schengen-Raum, daher Ausweiskontrolle).', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '−1 h' },
  pt: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '−1 h (Azoren −2 h)' },
  es: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '±0 h' },
  it: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '±0 h' },
  gr: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '+1 h' },
  hr: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '±0 h' },
  me: { visa: 'frei', visaText: 'Montenegro und Albanien: kein Visum nötig.', stay: 'bis 90 Tage innerhalb von 180 Tagen', doc: 'Reisepass empfohlen (Personalausweis wird meist akzeptiert, in Montenegro bis 30 Tage)', currency: 'Euro (Montenegro) / Lek (ALL)', time: '±0 h' },
  si: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '±0 h' },
  mt: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Euro (EUR)', time: '±0 h' },
  ro: { visa: 'eu', visaText: 'EU / Schengen – kein Visum.', stay: 'unbegrenzt', doc: ID, currency: 'Leu (RON)', time: '+1 h' },
};
