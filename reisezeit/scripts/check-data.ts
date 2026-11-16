// Prüft alle Datendateien gegen das Zod-Schema und auf Querbezüge.
// Aufruf: npm run check:data  (läuft automatisch vor jedem Build)
import { z } from 'zod';
import countries from '../src/data/countries.json' with { type: 'json' };
import places from '../src/data/places.json' with { type: 'json' };
import interests from '../src/data/interests.json' with { type: 'json' };
import { Country, Interest, Place } from '../src/data/schema';

const errors: string[] = [];
const err = (msg: string) => errors.push(msg);

function parseAll<T>(name: string, schema: z.ZodType<T>, list: unknown[]): T[] {
  const ok: T[] = [];
  list.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) ok.push(r.data);
    else {
      const id = (item as { id?: string })?.id ?? `#${i}`;
      for (const issue of r.error.issues) err(`${name} ${id}: ${issue.path.join('.')} – ${issue.message}`);
    }
  });
  return ok;
}

const cs = parseAll('Land', Country, countries);
const ps = parseAll('Ort', Place, places);
parseAll('Vorliebe', Interest, interests);

function dupes(kind: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) err(`${kind}: doppelte ID „${id}“`);
    seen.add(id);
  }
}
dupes('Land', cs.map((c) => c.id));
dupes('Region', cs.flatMap((c) => c.regions.map((r) => r.id)));
dupes('Ort', ps.map((p) => p.id));

const countryIds = new Map(cs.map((c) => [c.id, c]));
for (const p of ps) {
  const c = countryIds.get(p.countryId);
  if (!c) err(`Ort ${p.id}: Land „${p.countryId}“ existiert nicht`);
  else if (!c.regions.some((r) => r.id === p.regionId)) err(`Ort ${p.id}: Region „${p.regionId}“ gehört nicht zu ${c.name}`);
  if (Object.keys(p.interests).length === 0) err(`Ort ${p.id}: keine Vorlieben hinterlegt`);
  if (p.lat === 0 && p.lon === 0) err(`Ort ${p.id}: Koordinaten fehlen`);
}

if (errors.length) {
  console.error(`Daten-Check fehlgeschlagen (${errors.length} Fehler):`);
  for (const e of errors) console.error('  – ' + e);
  process.exit(1);
}
console.log(
  `Daten-Check ok: ${cs.length} Länder, ${cs.reduce((s, c) => s + c.regions.length, 0)} Regionen, ${ps.length} Orte`,
);
