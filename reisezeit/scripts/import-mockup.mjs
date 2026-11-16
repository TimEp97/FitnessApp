// Einmaliges Import-Skript: wandelt die Daten aus dem Mockup (Main.dc.html, Planner.dc.html)
// in countries.json, places.json und interests.json um.
//
// Aufruf: node scripts/import-mockup.mjs <pfad/zu/Main.dc.html> <pfad/zu/Planner.dc.html>
//
// Die Mockup-Dateien enthalten nur Daten-Arrays und kleine Hilfsfunktionen. Das Skript schneidet
// die Daten-Arrays als Text heraus und liest sie per JSON.parse (kein Code wird ausgeführt).
// Felder, die das Mockup nicht kennt (crowd, priceLevel, flightHoursFromDE, stays.budget/luxus …),
// werden mit nachvollziehbaren Schätzregeln vorbelegt und sind von Hand nachzuschärfen.
import fs from 'node:fs';
import path from 'node:path';

const [mainPath, plannerPath] = process.argv.slice(2);
if (!mainPath || !plannerPath) {
  console.error('Aufruf: node scripts/import-mockup.mjs Main.dc.html Planner.dc.html');
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function slice(src, start, end) {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Abschnitt nicht gefunden: ${start}`);
  return src.slice(a, b);
}

const main = fs.readFileSync(mainPath, 'utf8');
const planner = fs.readFileSync(plannerPath, 'utf8');

// Die Arrays werden nur als Text herausgeschnitten und mit JSON.parse gelesen – es wird kein
// Code aus den Mockup-Dateien ausgeführt. Objekte mit Schlüsseln ohne Anführungszeichen
// (PREF, CODES) werden vorher in gültiges JSON umgeschrieben.
const json = (txt) => JSON.parse(txt.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":'));
const arr = (src, name, end) =>
  json(slice(src, `var ${name}=`, end).slice(`var ${name}=`.length).trim().replace(/;$/, ''));
const m = { DATA: arr(main, 'DATA', '\nfunction ranges') };
const p = {
  INTS: arr(planner, 'INTS', '\nvar INTL'),
  PREF: arr(planner, 'PREF', '\nvar CODES'),
  CODES: arr(planner, 'CODES', '\nvar CTRY'),
  PL: arr(planner, 'PL', '\nvar BY'),
};

// ---------------------------------------------------------------- Länder + Regionen
const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 3)
    .join('-');

// Regionen aus der ersten Reisezeiten-Übersicht (Asien/Afrika), die im Mockup fehlen.
const EXTRA_REGIONS = {
  CN: [['Tibet', 'YRYLGGLLGGLY', 'Feb–Mär oft für Ausländer gesperrt; Mai–Jun und Sep–Okt klarste Sicht.']],
  IN: [
    ['Tamil Nadu & Ostküste (Chennai, Pondicherry, Madurai)', 'GGLYYYYYYRRY', 'Nordostmonsun Okt–Dez – anders als im Rest Indiens.'],
    ['Nordosten (Sikkim, Darjeeling, Assam, Meghalaya)', 'LLGGLRRRYGGL', 'Meghalaya zählt zu den regenreichsten Orten der Welt; Okt–Nov klare Himalaya-Sicht.'],
  ],
  ZA: [['Drakensberge', 'YYGGGLLLGGGY', 'Sommer mit Gewittern; Winter klar, kalt, teils Schnee.']],
  TZ: [['Süd-Safari (Nyerere/Selous, Ruaha)', 'YYRRRLGGGGLY', 'Viele Camps Mär–Mai geschlossen.']],
};
// Länder aus der ersten Übersicht, die im Mockup fehlen.
const EXTRA_COUNTRIES = [
  ['Bangladesch', 'BD', 'Asien', 'Südasien', 'rice', ['leaf', 'paw'], 'Flussdelta mit den Mangroven der Sundarbans; der Monsun prägt das Jahr.', [['Dhaka, Sundarbans, Sylhet', 'GGLYYRRRRYGG', 'Monsun Jun–Sep; Zyklongefahr im Mai und Okt–Nov.']]],
  ['Katar', 'QA', 'Asien', 'Westasien', 'city', ['city', 'sun'], 'Wüstenstadt am Golf – ein Winterziel.', [['Doha', 'GGGLYRRRYLGG', 'Wie die Emirate – Sommer extrem heiß.']]],
  ['Saudi-Arabien', 'SA', 'Asien', 'Westasien', 'desert', ['sun', 'temple'], 'Wüstenlandschaften und Felsengräber in AlUla – nur im Winter angenehm.', [['Riad, Dschidda, AlUla', 'GGLYRRRRYLGG', 'AlUla-Wüste im Winter ideal; Sommer kaum erträglich.']]],
  ['Kirgistan & Tadschikistan', 'KG', 'Asien', 'Westasien', 'mountain', ['mountain', 'tent'], 'Hochgebirge, Jurtencamps und der Pamir Highway – nur im Sommer erreichbar.', [['Tian Shan, Issyk-Kul, Pamir Highway', 'RRRYLGGGGLRR', 'Pässe und Jurtencamps nur im Sommer; Pamir am besten Jul–Sep.']]],
  ['Malawi', 'MW', 'Afrika', 'Ostafrika', 'lagoon', ['waves', 'paw'], 'Der Malawisee und ruhige Nationalparks.', [['Malawisee, Liwonde NP', 'RRRYLGGGGGYR', 'Sep–Okt heiß, aber beste Tierbeobachtung.']]],
  ['Mosambik', 'MZ', 'Afrika', 'Ostafrika', 'lagoon', ['waves', 'fish'], 'Inseln und Tauchreviere am Indischen Ozean.', [['Bazaruto, Tofo, Inhambane', 'RRRYLGGGGGLY', 'Buckelwale Jul–Okt; Jan–Mär Zyklongefahr.']]],
  ['Réunion', 'RE', 'Afrika', 'Indischer Ozean', 'mountain', ['mountain', 'leaf'], 'Vulkaninsel mit Talkesseln – ein Wanderparadies.', [['Wandern, Cirques, Piton de la Fournaise', 'RRYLGGGGGGLY', 'Trockener Winter ideal zum Wandern.']]],
  ['Sambia', 'ZM', 'Afrika', 'Südliches Afrika', 'safari', ['paw', 'tent'], 'Ursprüngliche Safari und Walking Safaris.', [['South Luangwa, Lower Zambezi, Livingstone', 'RRRYLGGGGGYR', 'Viele Buschcamps Nov–Apr geschlossen; Walking Safaris im trockenen Winter.']]],
  ['Ghana', 'GH', 'Afrika', 'Westafrika & Atlantik', 'beach', ['waves', 'temple'], 'Festungen an der Küste und lebendige Märkte.', [['Accra, Cape Coast, Kumasi, Mole NP', 'GGLYRRYLYYGG', 'Dez–Feb Harmattan (Saharastaub, diesig); kleine Trockenzeit im August.']]],
];

const rawCountries = [...m.DATA, ...EXTRA_COUNTRIES];
const countries = rawCountries.map(([name, code, continent, group, scene, tags, intro, regs]) => {
  const id = code.toLowerCase();
  const allRegs = [...regs, ...(EXTRA_REGIONS[code] ?? [])];
  const used = new Set();
  return {
    id,
    name,
    continent,
    group,
    scene,
    tags,
    intro,
    regions: allRegs.map(([rname, climate, note]) => {
      let rid = `${id}-${slug(rname)}`;
      while (used.has(rid)) rid += '-2';
      used.add(rid);
      return { id: rid, name: rname, climate, note };
    }),
  };
});

// ---------------------------------------------------------------- Orte
const COUNTRY_OF = { AL: 'me' }; // Albanien gehört im Mockup zu „Montenegro & Albanien“
const CODE_REGION = {
  BKK: ['th', 'Bangkok'], NTH: ['th', 'Norden'], AND: ['th', 'Andamanensee'], GULF: ['th', 'Golf'],
  VNN: ['vn', 'Norden'], VNC: ['vn', 'Zentrum'], VNS: ['vn', 'Süden'], PQC: ['vn', 'Phu Quoc'],
  KH: ['kh', 'Angkor'], KHC: ['kh', 'Küste'], LA: ['la', 'Luang'],
};
const NAME_HINT = { lim: 'Küste', tdp: 'Patagonien', fte: 'Patagonien', sky: 'Highlands', edi: 'Edinburgh', vik: 'Ringstraße', rek: 'Ringstraße', ksa: 'Kotor', mde: 'Medellín', sal: 'Medellín', lof: 'Lofoten', tos: 'Lofoten' };

const PRICE = { th: 1, vn: 1, kh: 1, la: 1, bo: 1, co: 1, pe: 1, me: 1, ro: 1, br: 2, ar: 2, cl: 2, ec: 2, pt: 2, es: 2, gr: 2, hr: 2, si: 2, mt: 2, it: 2, gb: 3, is: 3, fo: 3, no: 3, fi: 3 };
const FLIGHT = { th: 12, vn: 13, kh: 14, la: 14, pe: 17, bo: 20, cl: 16, ar: 15, br: 13, co: 13, ec: 15, is: 3.5, fo: 4.5, no: 2.5, fi: 4.5, gb: 2, pt: 3, es: 3, it: 1.5, gr: 3, hr: 2, me: 2.5, si: 1.5, mt: 3, ro: 2.5 };
const FLIGHT_PLACE = { lnt: 14, pp: 14, pgn: 14, tao: 14, usm: 13, gps: 19, pdl: 5, lof: 5, tos: 4.5, rvn: 5, tdp: 19, fte: 18, uyu: 22, lnc: 16, ksa: 4, sky: 4, jtr: 4.5, nax: 5, pai: 14, sap: 15, hlb: 14, mek: 15, kmp: 16 };
const INTL = new Set(['bkk', 'hkt', 'han', 'sgn', 'pnh', 'rep', 'lim', 'scl', 'bue', 'rio', 'uio', 'rek', 'lis', 'opo', 'ath', 'ctg', 'mde', 'edi', 'bgo', 'svq', 'mla', 'pmo', 'her', 'spu', 'dbv', 'dad', 'cnx']);
const CLOSED = { lnt: [5, 6, 7, 8], tdp: [5, 6, 7, 8], fte: [5, 6, 7] };
const EVENTS = {
  uyu: [
    { month: 0, name: 'Spiegeleffekt auf dem Salar', interest: 'natur', overridesRain: true },
    { month: 1, name: 'Spiegeleffekt auf dem Salar', interest: 'natur', overridesRain: true },
  ],
  cnx: [{ month: 10, name: 'Lichterfest Yi Peng / Loy Krathong', interest: 'kultur' }],
  bkk: [{ month: 3, name: 'Songkran (Thai-Neujahr)', interest: 'nightlife' }],
  rio: [{ month: 1, name: 'Karneval', interest: 'nightlife' }],
  edi: [{ month: 7, name: 'Edinburgh Festival', interest: 'kultur' }],
  lpb: [{ month: 1, name: 'Karneval von Oruro (Ausflug)', interest: 'kultur' }],
  tos: [
    { month: 0, name: 'Nordlicht-Saison', interest: 'natur' },
    { month: 1, name: 'Nordlicht-Saison', interest: 'natur' },
  ],
  rvn: [
    { month: 11, name: 'Weihnachtszeit in Lappland', interest: 'abenteuer' },
    { month: 0, name: 'Nordlicht-Saison', interest: 'natur' },
  ],
};
const HEAT = {
  svq: [16, 18, 22, 24, 28, 33, 36, 36, 31, 26, 20, 16],
  grx: [13, 15, 19, 21, 26, 32, 35, 36, 30, 24, 17, 13],
  bkk: [32, 33, 34, 35, 34, 33, 32, 32, 32, 32, 31, 31],
  sgn: [32, 33, 34, 35, 34, 32, 32, 32, 31, 31, 31, 31],
  ath: [13, 14, 16, 20, 25, 30, 33, 33, 28, 23, 18, 14],
};

function staysFor(ints, komfort) {
  const has = (k) => ints.includes(k);
  const budget = has('strand') ? 'Einfacher Bungalow in Strandnähe'
    : has('city') ? 'Guesthouse oder Hostel im Zentrum'
    : has('berge') || has('natur') ? 'Familiengeführtes Gästehaus'
    : 'Einfaches Gästehaus';
  const luxus = has('strand') ? 'Resort mit Pool und Meerblick'
    : has('city') ? 'Designhotel mit Rooftop-Bar'
    : has('berge') || has('natur') ? 'Boutique-Lodge mit Panoramablick'
    : 'Boutique-Hotel in historischem Gebäude';
  return { budget, komfort, luxus };
}

// Andrang je Monat geschätzt aus dem Klima-Code (G=2, L/Y=1, R=0) plus Ferienspitzen.
function crowdFor(climate, area) {
  return [...climate]
    .map((c, i) => {
      let v = { G: 2, L: 1, Y: 1, R: 0 }[c];
      if (area === 'Europa' && (i === 6 || i === 7)) v += 1;
      if (area === 'Südostasien' && (i === 11 || i === 0) && c === 'G') v += 1;
      if (area === 'Südamerika' && (i === 0 || i === 1) && c !== 'R') v += 1;
      return Math.min(3, v);
    })
    .join('');
}

const countryById = new Map(countries.map((c) => [c.id, c]));
const areaOf = (c) => (c.continent === 'Asien' && c.group === 'Südostasien' ? 'Südostasien' : c.continent);

const places = p.PL.map(([id, name, cc, lat, lon, code, flags, tip]) => {
  const countryId = COUNTRY_OF[cc] ?? cc.toLowerCase();
  const country = countryById.get(countryId);
  if (!country) throw new Error(`Land fehlt für ${id}`);
  let region;
  let climate = p.CODES[code] ?? code;
  if (p.CODES[code]) {
    const [cid, hint] = CODE_REGION[code];
    region = countryById.get(cid).regions.find((r) => r.name.includes(hint));
  } else {
    const hint = NAME_HINT[id];
    const same = country.regions.filter((r) => r.climate === climate);
    region =
      (hint && country.regions.find((r) => r.name.includes(hint))) ||
      same.find((r) => r.name.toLowerCase().includes(name.split(/[ (]/)[0].toLowerCase())) ||
      same[0] ||
      country.regions[0];
  }
  if (!region) throw new Error(`Region fehlt für ${id}`);
  const [ints, komfort] = p.PREF[id];
  const interests = Object.fromEntries(ints.map((k) => [k, 3]));
  const place = {
    id,
    name,
    countryId,
    regionId: region.id,
    lat,
    lon,
    ...(region.climate !== climate ? { climate } : {}),
    crowd: crowdFor(climate, areaOf(country)),
    priceLevel: id === 'gps' ? 3 : PRICE[countryId],
    interests,
    tip,
    stays: staysFor(ints, komfort),
    ...(EVENTS[id] ? { events: EVENTS[id] } : {}),
    transport: {
      airport: flags.includes('a'),
      ...(INTL.has(id) ? { intlAirport: true } : {}),
      rail: flags.includes('r'),
      island: flags.includes('i'),
    },
    flightHoursFromDE: FLIGHT_PLACE[id] ?? FLIGHT[countryId],
    ...(CLOSED[id] ? { closedMonths: CLOSED[id] } : {}),
    ...(HEAT[id] ? { maxTempC: HEAT[id] } : {}),
    safety: 0,
  };
  return place;
});

const interests = p.INTS.map(([id, label, icon]) => ({ id, label, icon }));

const dataDir = path.join(root, 'src/data');
fs.writeFileSync(path.join(dataDir, 'countries.json'), JSON.stringify(countries, null, 1) + '\n');
fs.writeFileSync(path.join(dataDir, 'places.json'), JSON.stringify(places, null, 1) + '\n');
fs.writeFileSync(path.join(dataDir, 'interests.json'), JSON.stringify(interests, null, 1) + '\n');
console.log(`${countries.length} Länder, ${countries.reduce((s, c) => s + c.regions.length, 0)} Regionen, ${places.length} Orte`);
