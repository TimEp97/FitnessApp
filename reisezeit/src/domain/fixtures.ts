// Feste Testdaten für die Rechenbeispiele aus dem Algorithmus-Konzept.
// Bewusst unabhängig von countries.json/places.json, damit Datenpflege die Tests nicht bricht.
import type { Country, Place } from '../data/schema';
import type { Inputs } from './types';

const region = (id: string, name: string, climate: string) => ({ id, name, climate, note: '' });
const country = (id: string, name: string, continent: Country['continent'], group: string, regions: Country['regions']): Country => ({
  id, name, continent, group, scene: 'beach', tags: [], intro: '', regions,
});

export const fxCountries: Country[] = [
  country('th', 'Thailand', 'Asien', 'Südostasien', [
    region('th-bkk', 'Bangkok & Zentralthailand', 'GGLYYYYYRRGG'),
    region('th-nord', 'Norden', 'GLRRYYYYRLGG'),
    region('th-andaman', 'Andamanensee', 'GGGLYRRRRYLG'),
    region('th-golf', 'Golf von Thailand', 'LGGGLLLLYRRY'),
  ]),
  country('si', 'Slowenien', 'Europa', 'Mittelmeer & Balkan', [region('si-alpen', 'Julische Alpen', 'YYYLGGGGGLYY')]),
  country('fo', 'Färöer', 'Europa', 'Nordeuropa', [region('fo-all', 'Färöer-Inseln', 'RRRYLGGGLYRR')]),
  country('it', 'Italien', 'Europa', 'Mittelmeer & Balkan', [region('it-dol', 'Dolomiten', 'LLLYYGGGGLYL')]),
  country('bo', 'Bolivien', 'Südamerika', 'Andenstaaten', [region('bo-uyuni', 'Salar de Uyuni', 'RRYLGGGGGGLY')]),
  country('ec', 'Ecuador', 'Südamerika', 'Andenstaaten', [
    region('ec-gps', 'Galápagos', 'GGGGGLLLLLLG'),
    region('ec-anden', 'Anden', 'YYYYLGGGGLYY'),
  ]),
];

type PlaceInit = Partial<Place> & Pick<Place, 'id' | 'name' | 'countryId' | 'regionId' | 'lat' | 'lon'>;
const place = (p: PlaceInit): Place => ({
  crowd: '111111111111',
  priceLevel: 2,
  interests: {},
  tip: '',
  stays: { budget: '', komfort: '', luxus: '' },
  transport: { airport: false, rail: false, island: false },
  flightHoursFromDE: 12,
  safety: 0,
  ...p,
});

const TH = { countryId: 'th', flightHoursFromDE: 12, priceLevel: 2 as const };

export const fxPlaces: Place[] = [
  place({ ...TH, id: 'lnt', name: 'Koh Lanta', regionId: 'th-andaman', lat: 7.62, lon: 99.04, crowd: '332100000013',
    interests: { strand: 3, ruhe: 3, tauchen: 2, stays: 2 }, transport: { airport: false, rail: false, island: true },
    flightHoursFromDE: 14, closedMonths: [5, 6, 7, 8] }),
  place({ ...TH, id: 'bkk', name: 'Bangkok', regionId: 'th-bkk', lat: 13.75, lon: 100.5,
    interests: { kultur: 3, food: 3, nightlife: 3, city: 3 }, transport: { airport: true, intlAirport: true, rail: true, island: false } }),
  place({ ...TH, id: 'cnx', name: 'Chiang Mai', regionId: 'th-nord', lat: 18.79, lon: 98.98,
    interests: { kultur: 3, food: 3, natur: 3, ruhe: 3 }, transport: { airport: true, rail: true, island: false } }),
  place({ ...TH, id: 'ayu', name: 'Ayutthaya', regionId: 'th-bkk', lat: 14.35, lon: 100.57,
    interests: { kultur: 3 }, transport: { airport: false, rail: true, island: false } }),
  place({ ...TH, id: 'kbv', name: 'Krabi', regionId: 'th-andaman', lat: 8.03, lon: 98.83,
    interests: { strand: 3, abenteuer: 3, natur: 3, stays: 3 }, transport: { airport: true, rail: false, island: false } }),
  place({ ...TH, id: 'hkt', name: 'Phuket', regionId: 'th-andaman', lat: 7.88, lon: 98.39,
    interests: { strand: 3, tauchen: 3, nightlife: 3 }, transport: { airport: true, intlAirport: true, rail: false, island: false } }),
  place({ ...TH, id: 'usm', name: 'Koh Samui', regionId: 'th-golf', lat: 9.51, lon: 100.01,
    interests: { strand: 3, ruhe: 3 }, transport: { airport: true, rail: false, island: true } }),
  place({ ...TH, id: 'tao', name: 'Koh Tao', regionId: 'th-golf', lat: 10.1, lon: 99.84,
    interests: { tauchen: 3, strand: 3, abenteuer: 3 }, transport: { airport: false, rail: false, island: true } }),

  // Beispiel 2 (Europa, Juli, Budget)
  place({ id: 'bled', name: 'Bled', countryId: 'si', regionId: 'si-alpen', lat: 46.37, lon: 14.11,
    crowd: '000011220000', priceLevel: 2, flightHoursFromDE: 1.5,
    interests: { berge: 3, natur: 3, abenteuer: 3 }, transport: { airport: false, rail: true, island: false } }),
  place({ id: 'fae', name: 'Färöer', countryId: 'fo', regionId: 'fo-all', lat: 62.01, lon: -6.77,
    crowd: '000001110000', priceLevel: 3, flightHoursFromDE: 5,
    interests: { berge: 3, natur: 3, abenteuer: 2 }, transport: { airport: true, rail: false, island: true } }),
  place({ id: 'dol', name: 'Dolomiten', countryId: 'it', regionId: 'it-dol', lat: 46.54, lon: 11.8,
    crowd: '000001330000', priceLevel: 3, flightHoursFromDE: 1.5,
    interests: { berge: 3, natur: 3, abenteuer: 2 }, transport: { airport: false, rail: false, island: false } }),

  // Uyuni: im Februar eigentlich Regenzeit, aber Spiegeleffekt-Event
  place({ id: 'uyu', name: 'Salar de Uyuni', countryId: 'bo', regionId: 'bo-uyuni', lat: -20.46, lon: -66.83,
    climate: 'RRYLGGGGGGLY', flightHoursFromDE: 20, interests: { natur: 3, abenteuer: 3 },
    events: [{ month: 1, name: 'Spiegeleffekt', interest: 'natur', overridesRain: true }],
    transport: { airport: true, rail: false, island: false } }),

  place({ id: 'gps', name: 'Galápagos', countryId: 'ec', regionId: 'ec-gps', lat: -0.74, lon: -90.31,
    flightHoursFromDE: 19, interests: { tauchen: 3, natur: 3 }, transport: { airport: true, rail: false, island: true } }),
  place({ id: 'uio', name: 'Quito', countryId: 'ec', regionId: 'ec-anden', lat: -0.18, lon: -78.47,
    flightHoursFromDE: 15, interests: { kultur: 3, berge: 3 }, transport: { airport: true, intlAirport: true, rail: false, island: false } }),
];

export const baseInputs: Inputs = {
  month: 2,
  days: 14,
  interests: [],
  region: 'Alle',
  pace: 'mid',
  style: 'komfort',
  party: 'solo',
  exclusions: { noLongHaul: false, noHeat: false, noMalaria: false },
};
