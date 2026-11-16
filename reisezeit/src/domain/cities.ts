import type { Country, Place, Region } from '../data/schema';

export interface CityEntry {
  name: string;
  /** gesetzt, wenn der Ort im Planer existiert (dann zur Route hinzufügbar) */
  placeId?: string;
}

/** Sammelbegriffe, die keine Orte sind */
const NOT_A_PLACE = new Set(['wandern', 'nationalparks', 'safari']);

/**
 * Ortsnamen aus einem Regionsnamen lesen:
 * „Norden (Chiang Mai, Chiang Rai, Pai)“ → Chiang Mai, Chiang Rai, Pai
 * „Angkor (Siem Reap) & Phnom Penh“      → Siem Reap, Phnom Penh
 * „Luang Prabang, Vang Vieng, Vientiane“ → alle drei
 * „Bangkok & Zentralthailand“            → Bangkok, Zentralthailand
 */
export function namesFromRegion(regionName: string): string[] {
  const out: string[] = [];
  const m = regionName.match(/^(.*?)\(([^)]*)\)(.*)$/);
  if (m) {
    out.push(...m[2].split(/,|\//));
    out.push(...m[3].split('&'));
  } else if (regionName.includes(',')) {
    out.push(...regionName.split(','));
  } else {
    out.push(...regionName.split('&'));
  }
  return out
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !NOT_A_PLACE.has(s.toLowerCase()));
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const sameCity = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ') || x.includes(`(${y}`) || y.includes(`(${x}`);
};

/** Orte einer Region: zuerst die Planer-Orte, dann weitere Namen aus dem Regionsnamen */
export function citiesOfRegion(region: Region, places: Place[]): CityEntry[] {
  const own = places.filter((p) => p.regionId === region.id);
  const out: CityEntry[] = own.map((p) => ({ name: p.name, placeId: p.id }));
  for (const name of namesFromRegion(region.name)) {
    if (!out.some((c) => sameCity(c.name, name))) out.push({ name });
  }
  return out;
}

/** Alle Orte eines Landes (ohne Doppelte), Planer-Orte zuerst */
export function citiesOfCountry(country: Country, places: Place[]): CityEntry[] {
  const all = country.regions.flatMap((r) => citiesOfRegion(r, places));
  const out: CityEntry[] = [];
  for (const c of [...all.filter((c) => c.placeId), ...all.filter((c) => !c.placeId)]) {
    if (!out.some((o) => sameCity(o.name, c.name))) out.push(c);
  }
  return out;
}
