// Reiseprofil: Punkte, Stufen, Auszeichnungen und Vergleich – reine Funktionen.
import { ISLAND_NATIONS, WORLD, WORLD_BY_CODE, WORLD_CONTINENTS, type WorldContinent } from '../data/world';

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
  points: number;
  /** Anteil der Länder der Welt in Prozent */
  worldShare: number;
}

export function profileStats(p: Pick<TravelProfile, 'countries' | 'places'>): ProfileStats {
  const known = [...new Set(p.countries)].filter((c) => WORLD_BY_CODE.has(c));
  const perContinent = Object.fromEntries(WORLD_CONTINENTS.map((c) => [c, 0])) as Record<WorldContinent, number>;
  for (const code of known) perContinent[WORLD_BY_CODE.get(code)!.continent]++;
  const continents = WORLD_CONTINENTS.filter((c) => perContinent[c] > 0);
  const places = new Set(p.places).size;
  return {
    countries: known.length,
    places,
    continents,
    perContinent,
    islands: known.filter((c) => ISLAND_NATIONS.has(c)).length,
    points: known.length * POINTS.country + places * POINTS.place + continents.length * POINTS.continent,
    worldShare: Math.round((known.length / WORLD.length) * 100),
  };
}

// ---------------------------------------------------------------- Stufen
export const LEVELS = [
  { min: 0, name: 'Neuling' },
  { min: 50, name: 'Urlauber' },
  { min: 150, name: 'Entdecker' },
  { min: 300, name: 'Weltenbummler' },
  { min: 500, name: 'Globetrotter' },
  { min: 800, name: 'Weltreisender' },
  { min: 1200, name: 'Reiselegende' },
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
export interface Badge {
  id: string;
  name: string;
  /** Bedingung als Text */
  how: string;
  icon: 'flag' | 'compass' | 'globe' | 'crown' | 'map' | 'palm' | 'mountain' | 'pin' | 'star' | 'sun' | 'plane' | 'landmark';
  /** Fortschritt als [erreicht, Ziel] */
  progress(s: ProfileStats): [number, number];
}

const count = (n: (s: ProfileStats) => number, goal: number) => (s: ProfileStats): [number, number] => [Math.min(n(s), goal), goal];

export const BADGES: Badge[] = [
  { id: 'erste-reise', name: 'Erste Reise', how: '1 Land bereist', icon: 'flag', progress: count((s) => s.countries, 1) },
  { id: 'entdecker', name: 'Entdecker', how: '5 Länder bereist', icon: 'compass', progress: count((s) => s.countries, 5) },
  { id: 'weltenbummler', name: 'Weltenbummler', how: '10 Länder bereist', icon: 'plane', progress: count((s) => s.countries, 10) },
  { id: 'globetrotter', name: 'Globetrotter', how: '25 Länder bereist', icon: 'globe', progress: count((s) => s.countries, 25) },
  { id: 'weltbuerger', name: 'Weltbürger', how: '50 Länder bereist', icon: 'crown', progress: count((s) => s.countries, 50) },
  { id: 'drei-kontinente', name: 'Drei Kontinente', how: '3 Kontinente bereist', icon: 'map', progress: count((s) => s.continents.length, 3) },
  { id: 'alle-kontinente', name: 'Alle Kontinente', how: 'Alle 6 Kontinente bereist', icon: 'star', progress: count((s) => s.continents.length, 6) },
  { id: 'europa-kenner', name: 'Europa-Kenner', how: '10 Länder in Europa', icon: 'landmark', progress: count((s) => s.perContinent.Europa, 10) },
  { id: 'asien-fan', name: 'Asien-Fan', how: '5 Länder in Asien', icon: 'sun', progress: count((s) => s.perContinent.Asien, 5) },
  { id: 'afrika-abenteurer', name: 'Afrika-Abenteurer', how: '3 Länder in Afrika', icon: 'mountain', progress: count((s) => s.perContinent.Afrika, 3) },
  { id: 'amerika-reisender', name: 'Amerika-Reisender', how: '5 Länder in Nord- und Südamerika', icon: 'compass', progress: count((s) => s.perContinent.Nordamerika + s.perContinent.Südamerika, 5) },
  { id: 'inselhuepfer', name: 'Inselhüpfer', how: '3 Inselstaaten bereist', icon: 'palm', progress: count((s) => s.islands, 3) },
  { id: 'ortskenner', name: 'Ortskenner', how: '10 Orte aus der App besucht', icon: 'pin', progress: count((s) => s.places, 10) },
];

export function earnedBadges(s: ProfileStats): Badge[] {
  return BADGES.filter((b) => {
    const [have, goal] = b.progress(s);
    return have >= goal;
  });
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
