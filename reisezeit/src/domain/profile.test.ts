import { describe, expect, it } from 'vitest';
import { COUNTRY_INFO } from '../data/countryInfo';
import countries from '../data/countries.json';
import { WORLD, WORLD_BY_CODE, isoOfAppCountry } from '../data/world';
import { BADGES, compareProfiles, decodeProfile, earnedBadges, encodeProfile, leaderboard, levelFor, profileStats } from './profile';

describe('Reiseprofil', () => {
  it('zählt Punkte: 10 je Land, 3 je Ort, 25 je Kontinent', () => {
    const s = profileStats({ countries: ['TH', 'VN', 'IT', 'XX', 'TH'], places: ['bkk', 'cnx'] });
    expect(s.countries).toBe(3);
    expect(s.continents).toEqual(['Europa', 'Asien']);
    expect(s.points).toBe(3 * 10 + 2 * 3 + 2 * 25);
  });
  it('Stufen und Fortschritt', () => {
    expect(levelFor(0).name).toBe('Neuling');
    expect(levelFor(160).name).toBe('Entdecker');
    expect(levelFor(160).toNext).toBe(140);
    expect(levelFor(5000).progress).toBe(1);
  });
  it('vergibt Auszeichnungen', () => {
    const ids = (c: string[]) => earnedBadges(profileStats({ countries: c, places: [] })).map((b) => b.id);
    expect(ids([])).toEqual([]);
    expect(ids(['TH'])).toEqual(['erste-reise']);
    const five = ids(['TH', 'VN', 'JP', 'ID', 'LK', 'IT', 'PE']);
    expect(five).toEqual(expect.arrayContaining(['entdecker', 'drei-kontinente', 'asien-fan', 'inselhuepfer']));
    expect(five).not.toContain('weltenbummler');
    expect(BADGES.every((b) => b.progress(profileStats({ countries: [], places: [] }))[0] === 0)).toBe(true);
  });
  it('Vergleich und Rangliste', () => {
    const a = { name: 'A', countries: ['TH', 'IT', 'PE'], places: [] };
    const b = { name: 'B', countries: ['IT', 'JP'], places: [] };
    expect(compareProfiles(a, b)).toEqual({ both: ['IT'], onlyA: ['PE', 'TH'], onlyB: ['JP'] });
    const board = leaderboard([b, a, { name: 'C', countries: ['IT', 'JP'], places: [] }]);
    expect(board.map((r) => [r.name, r.rank])).toEqual([['A', 1], ['B', 2], ['C', 2]]);
  });
  it('Profil-Link: kodieren → dekodieren', () => {
    const p = { name: 'Tim Müller ✈', countries: ['VN', 'TH', 'DE'], places: ['cnx', 'bkk'] };
    const back = decodeProfile(encodeProfile(p));
    expect(back).toEqual({ name: p.name, countries: ['DE', 'TH', 'VN'], places: ['bkk', 'cnx'] });
    expect(decodeProfile(encodeProfile({ name: '', countries: [], places: [] }))).toEqual({ name: 'Gast', countries: [], places: [] });
    expect(decodeProfile('quatsch')).toBeNull();
    expect(decodeProfile('p1.QQ.th')).toBeNull();
  });
});

describe('Stammdaten', () => {
  it('Weltliste ohne Doppelte', () => {
    expect(new Set(WORLD.map((c) => c.code)).size).toBe(WORLD.length);
    expect(WORLD.length).toBeGreaterThan(190);
  });
  it('jedes Land der App hat Einreise-Infos und einen ISO-Code', () => {
    for (const c of countries) {
      expect(COUNTRY_INFO[c.id], c.name).toBeDefined();
      for (const iso of isoOfAppCountry(c.id)) expect(WORLD_BY_CODE.has(iso), `${c.name} → ${iso}`).toBe(true);
    }
  });
});
