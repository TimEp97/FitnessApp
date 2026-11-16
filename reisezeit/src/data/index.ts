import countriesJson from './countries.json';
import placesJson from './places.json';
import interestsJson from './interests.json';
import type { Country, Interest, Place } from './schema';
import { makeCtx } from '../domain/ctx';

// Die JSON-Dateien werden vor jedem Build mit `npm run check:data` gegen das Schema geprüft.
export const countries = countriesJson as Country[];
export const places = placesJson as Place[];
export const interests = interestsJson as Interest[];

export const ctx = makeCtx(countries, places);
export const countryById = new Map(countries.map((c) => [c.id, c]));
export const regionById = new Map(countries.flatMap((c) => c.regions.map((r) => [r.id, r] as const)));
