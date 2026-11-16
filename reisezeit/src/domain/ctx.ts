import type { Country, Place, Region } from '../data/schema';
import { climateOf } from './climate';
import type { Area, Ctx } from './types';

export function areaOfCountry(c: Country): Area {
  if (c.continent === 'Asien') return c.group === 'Südostasien' ? 'Südostasien' : 'Asien';
  return c.continent;
}

/** Baut den Datenzugriff für die Domain-Funktionen (auch für Test-Fixtures nutzbar) */
export function makeCtx(countries: Country[], places: Place[]): Ctx {
  const countryById = new Map(countries.map((c) => [c.id, c]));
  const regionById = new Map<string, Region>();
  for (const c of countries) for (const r of c.regions) regionById.set(r.id, r);
  const placeById = new Map(places.map((p) => [p.id, p]));
  return {
    places,
    climate: (p) => climateOf(p, regionById),
    country: (p) => {
      const c = countryById.get(p.countryId);
      if (!c) throw new Error(`Land ${p.countryId} fehlt`);
      return c;
    },
    region: (p) => {
      const r = regionById.get(p.regionId);
      if (!r) throw new Error(`Region ${p.regionId} fehlt`);
      return r;
    },
    area: (p) => areaOfCountry(countryById.get(p.countryId)!),
    place: (id) => placeById.get(id),
  };
}
