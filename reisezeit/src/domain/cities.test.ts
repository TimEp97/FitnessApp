import { describe, expect, it } from 'vitest';
import countries from '../data/countries.json';
import places from '../data/places.json';
import type { Country, Place } from '../data/schema';
import { citiesOfCountry, citiesOfRegion, namesFromRegion } from './cities';

const cs = countries as Country[];
const ps = places as Place[];
const th = cs.find((c) => c.id === 'th')!;

describe('Orte je Region', () => {
  it('liest Orte aus dem Regionsnamen', () => {
    expect(namesFromRegion('Norden (Chiang Mai, Chiang Rai, Pai)')).toEqual(['Chiang Mai', 'Chiang Rai', 'Pai']);
    expect(namesFromRegion('Angkor (Siem Reap) & Phnom Penh')).toEqual(['Siem Reap', 'Phnom Penh']);
    expect(namesFromRegion('Luang Prabang, Vang Vieng, Vientiane')).toEqual(['Luang Prabang', 'Vang Vieng', 'Vientiane']);
    expect(namesFromRegion('Süd-Safari (Nyerere/Selous, Ruaha)')).toEqual(['Nyerere', 'Selous', 'Ruaha']);
    expect(namesFromRegion('Baobab-Allee, Nosy Be, Nationalparks')).toEqual(['Baobab-Allee', 'Nosy Be']);
    expect(namesFromRegion('Malediven')).toEqual(['Malediven']);
  });
  it('Planer-Orte zuerst, keine Doppelten', () => {
    const andaman = th.regions.find((r) => r.id === 'th-andamanensee')!;
    const list = citiesOfRegion(andaman, ps);
    expect(list.map((c) => c.name)).toEqual(['Phuket', 'Krabi', 'Koh Lanta', 'Koh Phi Phi', 'Khao Lak']);
    expect(list.filter((c) => c.placeId).map((c) => c.placeId)).toEqual(['hkt', 'kbv', 'lnt', 'pp']);
  });
  it('jedes Land hat mindestens einen Ort', () => {
    for (const c of cs) expect(citiesOfCountry(c, ps).length, c.name).toBeGreaterThan(0);
  });
});
