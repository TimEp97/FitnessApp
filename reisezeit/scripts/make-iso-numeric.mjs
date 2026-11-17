// Erzeugt src/data/isoNumeric.json: numerischer ISO-Code (wie in world-atlas) → Alpha-2-Code.
// Wird für die Weltkarte im Reiseprofil gebraucht. Aufruf: node scripts/make-iso-numeric.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const topo = require('world-atlas/countries-110m.json');
const out = {};
const missing = [];
for (const g of topo.objects.countries.geometries) {
  const a2 = g.id ? iso.numericToAlpha2(String(g.id).padStart(3, '0')) : undefined;
  if (a2) out[String(g.id).padStart(3, '0')] = a2;
  else missing.push(g.properties?.name);
}
fs.writeFileSync(path.join(root, 'src/data/isoNumeric.json'), JSON.stringify(out) + '\n');
console.log(`${Object.keys(out).length} Länder zugeordnet; ohne Code: ${missing.join(', ')}`);
