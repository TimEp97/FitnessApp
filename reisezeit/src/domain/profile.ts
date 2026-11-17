// Reiseprofil: Punkte, Stufen, Auszeichnungen und Vergleich – reine Funktionen.
import placesJson from '../data/places.json';
import type { InterestId, Place } from '../data/schema';
import { ISLAND_NATIONS, WORLD, WORLD_BY_CODE, WORLD_CONTINENTS, type WorldContinent } from '../data/world';

const PLACE_BY_ID = new Map((placesJson as Place[]).map((p) => [p.id, p]));

/** Ländergruppen für Regions-Abzeichen */
export const REGION_SETS = {
  suedostasien: ['TH', 'VN', 'KH', 'LA', 'MY', 'SG', 'ID', 'PH', 'MM', 'BN', 'TL'],
  nordlicht: ['IS', 'NO', 'SE', 'FI', 'DK', 'FO', 'GL'],
  mittelmeer: ['ES', 'FR', 'IT', 'HR', 'GR', 'TR', 'MT', 'CY', 'ME', 'AL', 'SI', 'MA', 'TN', 'EG', 'IL', 'LB'],
  anden: ['PE', 'BO', 'CL', 'EC', 'CO', 'AR'],
  safari: ['KE', 'TZ', 'UG', 'RW', 'ZA', 'NA', 'BW', 'ZW', 'ZM', 'MW', 'MZ'],
  seidenstrasse: ['UZ', 'KG', 'TJ', 'KZ', 'TM', 'GE', 'AM', 'AZ', 'IR', 'CN'],
} as const;
/** Länder, die überwiegend auf der Südhalbkugel liegen */
const SOUTH = new Set(['AU', 'NZ', 'ZA', 'NA', 'BW', 'ZW', 'ZM', 'MZ', 'MG', 'MU', 'TZ', 'AR', 'CL', 'BO', 'PE', 'BR', 'PY', 'UY', 'ID', 'FJ', 'PF', 'MW', 'LS', 'SZ', 'AO', 'RW', 'SC', 'WS', 'TO', 'VU', 'PG']);

export interface TravelProfile {
  name: string;
  /** ISO-Codes bereister Länder */
  countries: string[];
  /** Orte aus der App (places.json) */
  places: string[];
}

export const POINTS = { country: 10, place: 3, continent: 25 };

export interface ProfileStats {
  countries: number;
  places: number;
  continents: WorldContinent[];
  perContinent: Record<WorldContinent, number>;
  islands: number;
  /** besuchte Länder je Regionsgruppe */
  regions: Record<keyof typeof REGION_SETS, number>;
  /** Nord- und Südhalbkugel bereist */
  bothHemispheres: boolean;
  /** besuchte Orte je Vorliebe (z. B. strand, kultur) */
  placeKinds: Partial<Record<InterestId, number>>;
  points: number;
  /** davon Bonuspunkte aus Abzeichen */
  bonusPoints: number;
  /** Anteil der Länder der Welt in Prozent */
  worldShare: number;
}

export function profileStats(p: Pick<TravelProfile, 'countries' | 'places'>): ProfileStats {
  const base = baseStats(p);
  // Bonuspunkte für erreichte Abzeichen kommen obendrauf
  const bonus = BADGES.reduce((sum, b) => {
    const [have, goal] = b.progress(base);
    return sum + (have >= goal ? b.bonus : 0);
  }, 0);
  return { ...base, bonusPoints: bonus, points: base.points + bonus };
}

function baseStats(p: Pick<TravelProfile, 'countries' | 'places'>): ProfileStats {
  const known = [...new Set(p.countries)].filter((c) => WORLD_BY_CODE.has(c));
  const perContinent = Object.fromEntries(WORLD_CONTINENTS.map((c) => [c, 0])) as Record<WorldContinent, number>;
  for (const code of known) perContinent[WORLD_BY_CODE.get(code)!.continent]++;
  const continents = WORLD_CONTINENTS.filter((c) => perContinent[c] > 0);
  const placeIds = [...new Set(p.places)];
  const places = placeIds.length;
  const placeKinds: Partial<Record<InterestId, number>> = {};
  for (const id of placeIds) {
    for (const k of Object.keys(PLACE_BY_ID.get(id)?.interests ?? {}) as InterestId[]) placeKinds[k] = (placeKinds[k] ?? 0) + 1;
  }
  const regions = Object.fromEntries(
    Object.entries(REGION_SETS).map(([k, set]) => [k, known.filter((c) => (set as readonly string[]).includes(c)).length]),
  ) as ProfileStats['regions'];
  return {
    countries: known.length,
    places,
    continents,
    perContinent,
    islands: known.filter((c) => ISLAND_NATIONS.has(c)).length,
    regions,
    bothHemispheres: known.some((c) => SOUTH.has(c)) && known.some((c) => !SOUTH.has(c)),
    placeKinds,
    points: known.length * POINTS.country + places * POINTS.place + continents.length * POINTS.continent,
    bonusPoints: 0,
    worldShare: Math.round((known.length / WORLD.length) * 100),
  };
}

// ---------------------------------------------------------------- Stufen
export const LEVELS = [
  { min: 0, name: 'Neuling' },
  { min: 50, name: 'Urlauber' },
  { min: 150, name: 'Entdecker' },
  { min: 350, name: 'Weltenbummler' },
  { min: 700, name: 'Globetrotter' },
  { min: 1200, name: 'Weltreisender' },
  { min: 2000, name: 'Reiselegende' },
];

export function levelFor(points: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (points >= l.min) idx = i; });
  const next = LEVELS[idx + 1];
  const cur = LEVELS[idx];
  return {
    index: idx,
    name: cur.name,
    next: next?.name,
    toNext: next ? next.min - points : 0,
    /** Fortschritt zur nächsten Stufe, 0–1 */
    progress: next ? (points - cur.min) / (next.min - cur.min) : 1,
  };
}

// ---------------------------------------------------------------- Auszeichnungen
export type BadgeGroup = 'Länder' | 'Kontinente' | 'Regionen' | 'Erlebnisse';
export const BADGE_GROUPS: BadgeGroup[] = ['Länder', 'Kontinente', 'Regionen', 'Erlebnisse'];
export type BadgeIcon =
  | 'flag' | 'compass' | 'globe' | 'crown' | 'map' | 'palm' | 'mountain' | 'pin' | 'star' | 'sun' | 'plane' | 'landmark'
  | 'snow' | 'waves' | 'paw' | 'route' | 'city' | 'utensils' | 'leaf' | 'fish' | 'gem';

export interface Badge {
  id: string;
  group: BadgeGroup;
  name: string;
  /** Bedingung als Text */
  how: string;
  icon: BadgeIcon;
  /** Bonuspunkte beim Erreichen */
  bonus: number;
  /** Fortschritt als [erreicht, Ziel] */
  progress(s: ProfileStats): [number, number];
}

const count = (n: (s: ProfileStats) => number, goal: number) => (s: ProfileStats): [number, number] => [Math.min(n(s), goal), goal];
const kind = (k: InterestId) => (s: ProfileStats) => s.placeKinds[k] ?? 0;

export const BADGES: Badge[] = [
  // Länder – aufsteigende Stufen
  { id: 'erste-reise', group: 'Länder', name: 'Erste Reise', how: '1 Land bereist', icon: 'flag', bonus: 5, progress: count((s) => s.countries, 1) },
  { id: 'entdecker', group: 'Länder', name: 'Entdecker', how: '5 Länder bereist', icon: 'compass', bonus: 15, progress: count((s) => s.countries, 5) },
  { id: 'weltenbummler', group: 'Länder', name: 'Weltenbummler', how: '10 Länder bereist', icon: 'plane', bonus: 30, progress: count((s) => s.countries, 10) },
  { id: 'globetrotter', group: 'Länder', name: 'Globetrotter', how: '25 Länder bereist', icon: 'globe', bonus: 75, progress: count((s) => s.countries, 25) },
  { id: 'weltbuerger', group: 'Länder', name: 'Weltbürger', how: '50 Länder bereist', icon: 'crown', bonus: 150, progress: count((s) => s.countries, 50) },
  { id: 'hundert', group: 'Länder', name: 'Club der 100', how: '100 Länder bereist', icon: 'gem', bonus: 300, progress: count((s) => s.countries, 100) },
  { id: 'inselhuepfer', group: 'Länder', name: 'Inselhüpfer', how: '3 Inselstaaten bereist', icon: 'palm', bonus: 15, progress: count((s) => s.islands, 3) },
  // Kontinente
  { id: 'drei-kontinente', group: 'Kontinente', name: 'Drei Kontinente', how: '3 Kontinente bereist', icon: 'map', bonus: 25, progress: count((s) => s.continents.length, 3) },
  { id: 'alle-kontinente', group: 'Kontinente', name: 'Alle Kontinente', how: 'Alle 6 Kontinente bereist', icon: 'star', bonus: 150, progress: count((s) => s.continents.length, 6) },
  { id: 'aequator', group: 'Kontinente', name: 'Äquator-Überquerer', how: 'Nord- und Südhalbkugel bereist', icon: 'route', bonus: 25, progress: (s) => [s.bothHemispheres ? 1 : 0, 1] },
  { id: 'europa-kenner', group: 'Kontinente', name: 'Europa-Kenner', how: '10 Länder in Europa', icon: 'landmark', bonus: 30, progress: count((s) => s.perContinent.Europa, 10) },
  { id: 'asien-fan', group: 'Kontinente', name: 'Asien-Fan', how: '5 Länder in Asien', icon: 'sun', bonus: 20, progress: count((s) => s.perContinent.Asien, 5) },
  { id: 'afrika-abenteurer', group: 'Kontinente', name: 'Afrika-Abenteurer', how: '3 Länder in Afrika', icon: 'paw', bonus: 20, progress: count((s) => s.perContinent.Afrika, 3) },
  { id: 'amerika-reisender', group: 'Kontinente', name: 'Amerika-Reisender', how: '5 Länder in Nord- und Südamerika', icon: 'compass', bonus: 20, progress: count((s) => s.perContinent.Nordamerika + s.perContinent.Südamerika, 5) },
  // Regionen
  { id: 'suedostasien', group: 'Regionen', name: 'Südostasien-Kenner', how: '4 Länder in Südostasien', icon: 'palm', bonus: 25, progress: count((s) => s.regions.suedostasien, 4) },
  { id: 'nordlicht', group: 'Regionen', name: 'Nordlicht', how: '3 Länder im hohen Norden', icon: 'snow', bonus: 20, progress: count((s) => s.regions.nordlicht, 3) },
  { id: 'mittelmeer', group: 'Regionen', name: 'Mittelmeer-Runde', how: '5 Länder am Mittelmeer', icon: 'waves', bonus: 25, progress: count((s) => s.regions.mittelmeer, 5) },
  { id: 'anden', group: 'Regionen', name: 'Anden-Überquerer', how: '3 Andenländer', icon: 'mountain', bonus: 25, progress: count((s) => s.regions.anden, 3) },
  { id: 'safari', group: 'Regionen', name: 'Safari-Profi', how: '3 Safari-Länder in Afrika', icon: 'paw', bonus: 25, progress: count((s) => s.regions.safari, 3) },
  { id: 'seidenstrasse', group: 'Regionen', name: 'Seidenstraße', how: '3 Länder an der Seidenstraße', icon: 'route', bonus: 25, progress: count((s) => s.regions.seidenstrasse, 3) },
  // Erlebnisse – aus den besuchten Orten der App
  { id: 'ortskenner', group: 'Erlebnisse', name: 'Ortskenner', how: '10 Orte aus der App besucht', icon: 'pin', bonus: 20, progress: count((s) => s.places, 10) },
  { id: 'strandlaeufer', group: 'Erlebnisse', name: 'Strandläufer', how: '5 Strand-Orte besucht', icon: 'waves', bonus: 15, progress: count(kind('strand'), 5) },
  { id: 'kulturfan', group: 'Erlebnisse', name: 'Kulturfan', how: '5 Kultur-Orte besucht', icon: 'landmark', bonus: 15, progress: count(kind('kultur'), 5) },
  { id: 'gipfelstuermer', group: 'Erlebnisse', name: 'Gipfelstürmer', how: '3 Berg-Orte besucht', icon: 'mountain', bonus: 15, progress: count(kind('berge'), 3) },
  { id: 'grossstadt', group: 'Erlebnisse', name: 'Großstadt-Fan', how: '5 Städte besucht', icon: 'city', bonus: 15, progress: count(kind('city'), 5) },
  { id: 'feinschmecker', group: 'Erlebnisse', name: 'Feinschmecker', how: '5 Streetfood-Orte besucht', icon: 'utensils', bonus: 15, progress: count(kind('food'), 5) },
  { id: 'naturfreund', group: 'Erlebnisse', name: 'Naturfreund', how: '5 Natur-Orte besucht', icon: 'leaf', bonus: 15, progress: count(kind('natur'), 5) },
  { id: 'taucher', group: 'Erlebnisse', name: 'Unterwasser', how: '3 Tauch-Orte besucht', icon: 'fish', bonus: 15, progress: count(kind('tauchen'), 3) },
];

export function earnedBadges(s: ProfileStats): Badge[] {
  return BADGES.filter((b) => {
    const [have, goal] = b.progress(s);
    return have >= goal;
  });
}

/** Die nächsten erreichbaren Abzeichen: am weitesten fortgeschritten zuerst, begonnene vor unbegonnenen */
export function nextGoals(s: ProfileStats, limit = 3): { badge: Badge; have: number; goal: number; left: number }[] {
  return BADGES
    .map((badge) => {
      const [have, goal] = badge.progress(s);
      return { badge, have, goal, left: goal - have };
    })
    .filter((g) => g.left > 0)
    .sort((a, b) => b.have / b.goal - a.have / a.goal || a.left - b.left)
    .slice(0, limit);
}

/** Reisetyp aus den besuchten Orten */
const TYPES: [InterestId, string][] = [
  ['strand', 'Strandmensch'], ['kultur', 'Kulturfan'], ['berge', 'Gipfelstürmer'], ['city', 'Stadtmensch'],
  ['natur', 'Naturfreund'], ['food', 'Feinschmecker'], ['abenteuer', 'Abenteurer'], ['tauchen', 'Wasserratte'],
];
export function travelType(s: ProfileStats): string | null {
  const best = TYPES.map(([k, name]) => ({ name, n: s.placeKinds[k] ?? 0 })).sort((a, b) => b.n - a.n)[0];
  return best.n >= 2 ? best.name : null;
}

// ---------------------------------------------------------------- Vergleich
export interface Comparison {
  both: string[];
  onlyA: string[];
  onlyB: string[];
}

export function compareProfiles(a: Pick<TravelProfile, 'countries'>, b: Pick<TravelProfile, 'countries'>): Comparison {
  const A = new Set(a.countries), B = new Set(b.countries);
  const name = (c: string) => WORLD_BY_CODE.get(c)?.name ?? c;
  const sort = (list: string[]) => list.sort((x, y) => name(x).localeCompare(name(y), 'de'));
  return {
    both: sort([...A].filter((c) => B.has(c))),
    onlyA: sort([...A].filter((c) => !B.has(c))),
    onlyB: sort([...B].filter((c) => !A.has(c))),
  };
}

/** Rangliste: höchste Punktzahl zuerst; bei Gleichstand mehr Länder, dann Name */
export function leaderboard<T extends TravelProfile>(profiles: T[]): (T & { stats: ProfileStats; rank: number })[] {
  const rows = profiles
    .map((p) => ({ ...p, stats: profileStats(p) }))
    .sort((a, b) => b.stats.points - a.stats.points || b.stats.countries - a.stats.countries || a.name.localeCompare(b.name, 'de'));
  let rank = 0;
  let last = -1;
  return rows.map((r, i) => {
    if (r.stats.points !== last) { rank = i + 1; last = r.stats.points; }
    return { ...r, rank };
  });
}

// ---------------------------------------------------------------- Profil-Link (ohne Server)
// Format: p1.<Name als base64url>.<ISO-Codes ohne Trenner>.<Ort-IDs mit ->
const b64 = {
  enc: (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))),
};

export function encodeProfile(p: TravelProfile): string {
  const codes = [...new Set(p.countries)].filter((c) => WORLD_BY_CODE.has(c)).sort().join('');
  return ['p1', b64.enc(p.name.trim().slice(0, 40) || 'Gast'), codes || '_', [...new Set(p.places)].sort().join('-')].join('.');
}

export function decodeProfile(code: string, knownPlace?: (id: string) => boolean): TravelProfile | null {
  try {
    const [v, name, codes, places = ''] = decodeURIComponent(code).split('.');
    if (v !== 'p1' || !name) return null;
    const list = codes === '_' ? [] : codes.match(/[A-Z]{2}/g) ?? [];
    if (codes !== '_' && list.join('') !== codes) return null;
    return {
      name: b64.dec(name).slice(0, 40),
      countries: list.filter((c) => WORLD_BY_CODE.has(c)),
      places: places ? places.split('-').filter((id) => /^[a-z0-9]+$/.test(id) && (!knownPlace || knownPlace(id))) : [],
    };
  } catch {
    return null;
  }
}
