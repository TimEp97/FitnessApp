// Alle UI-Texte an einer Stelle (Vorbereitung für spätere Mehrsprachigkeit).
import type { ClimateCode, TagId } from '../data/schema';

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const MONTHS_FULL = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export const CODE_LABEL: Record<ClimateCode, string> = {
  G: 'Beste Zeit',
  L: 'Gut & ruhiger',
  Y: 'Mittel',
  R: 'Eher meiden',
};

export const LEGEND: { code: ClimateCode; text: string }[] = [
  { code: 'G', text: 'Beste Zeit' },
  { code: 'L', text: 'Gut, weniger los' },
  { code: 'Y', text: 'Mittel' },
  { code: 'R', text: 'Schlecht – Regenzeit, Monsun, Hitze' },
];

export const CODE_EXPLAIN: Record<ClimateCode, string> = {
  G: 'Klimatisch die beste Zeit: überwiegend trocken und angenehme Temperaturen. Meist Hauptsaison – früh buchen.',
  L: 'Gute Reisezeit mit weniger Andrang: Wetter meist schön, Preise oft niedriger als in der Hochsaison.',
  Y: 'Mittelmäßig: je nach Region sehr heiß, eher kühl oder wechselhaft mit Schauern. Machbar, mit Abstrichen.',
  R: 'Eher meiden: Regenzeit, Monsun, Stürme oder extreme Hitze. Manche Unterkünfte und Touren sind geschlossen.',
};

export const TAG_LABEL: Record<TagId, string> = {
  waves: 'Strand',
  temple: 'Kultur',
  mountain: 'Berge & Trekking',
  paw: 'Safari & Tiere',
  fish: 'Tauchen',
  city: 'Städte',
  snow: 'Ski & Schnee',
  wind: 'Wind & Kiten',
  leaf: 'Natur',
  sun: 'Sonne & Wüste',
  tent: 'Abenteuer',
  storm: 'Taifun-Risiko',
  surf: 'Surfen',
};

export const t = {
  appName: 'Reisezeit',
  tagline: 'Wann ist wo das beste Wetter? Asien, Afrika, Südamerika & Europa – Region für Region.',
  planTrip: 'Reise planen',
  searchLabel: 'Land, Region oder Ort suchen',
  searchPlaceholder: 'z. B. Bali, Safari, Tauchen, Kirschblüte …',
  whenTravel: 'Wann willst du reisen?',
  anytime: 'Jederzeit',
  allContinents: 'Alle',
  noResults: 'Nichts gefunden. Probier einen anderen Monat oder Suchbegriff.',
  bestTime: 'Beste Zeit',
  allCountries: 'Alle Länder',
  planHere: 'Reise hierhin planen',
  regionsHeading: 'Regionen – tippe auf einen Monat',
  footer:
    'Klimatische Durchschnittswerte. Länder mit Reisewarnungen sind nicht enthalten – vor der Reise die Reise- und Sicherheitshinweise des Auswärtigen Amts prüfen.',
  estimateNote: 'Wetter: klimatische Durchschnittswerte. Fahrzeiten sind grobe Schätzungen – bitte vor der Buchung prüfen.',
  steps: ['Vorlieben', 'Orte wählen', 'Verkehrsmittel', 'Reiseplan'],
};

/** Textbausteine für die Begründung eines Vorschlags (score.ts) */
export const REASON = {
  W: {
    G: (m: string) => `im ${m} Hauptsaison mit bestem Wetter`,
    L: (m: string) => `im ${m} gutes Wetter und weniger los`,
    Y: (m: string) => `im ${m} nur mittelmäßiges Wetter`,
    R: (m: string) => `im ${m} Regenzeit`,
  },
  P: (list: string) => `passt zu ${list}`,
  Pweak: 'passt nur teilweise zu deinen Vorlieben',
  A: { low: 'wenig Andrang', high: 'viel los' },
  B: { ok: 'passt zum Reisestil', cheap: 'günstiger als dein Reisestil', pricey: 'teurer als dein Reisestil' },
  F: { short: (h: number) => `kurze Anreise (ca. ${h} h)`, long: (h: number) => `${h} h Anreise` },
  E: (name: string) => name,
  minus: 'Minus',
};
