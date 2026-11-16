// Lädt frei lizenzierte Fotos von Wikimedia Commons für Länder und Orte und schreibt die
// Bildnachweise nach src/data/photos.json. Aufruf: node scripts/fetch-photos.mjs [--force]
//
// Quelle je Bild: Hauptbild des Wikipedia-Artikels aus scripts/photo-sources.json.
// Übernommen werden nur JPEGs mit Lizenz CC0, Public Domain, CC BY oder CC BY-SA; alles andere
// wird übersprungen (dann bleibt die Illustration). Autor, Lizenz und Quelle werden gespeichert und
// im Impressum sowie im PDF als Bildnachweis ausgegeben.
// Braucht Netzzugriff auf en.wikipedia.org, commons.wikimedia.org und upload.wikimedia.org.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/photo-sources.json'), 'utf8'));
const outFile = path.join(root, 'src/data/photos.json');
const imgDir = path.join(root, 'public/img/photos');
const force = process.argv.includes('--force');
const UA = { 'User-Agent': 'reisezeit-photo-fetch/1.0 (static travel app build script)' };
const OK_LICENSE = /^(cc0|cc[ -]by(-sa)?[ -]\d|public domain|pd)/i;
const WIDTH = 1200;

fs.mkdirSync(imgDir, { recursive: true });
const photos = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${host}: HTTP ${res.status}`);
  return res.json();
}

async function one(key, title) {
  const page = Object.values((await api('en.wikipedia.org', { action: 'query', titles: title, redirects: '1', prop: 'pageimages', piprop: 'name' })).query.pages)[0];
  if (!page?.pageimage) return `kein Hauptbild im Artikel „${title}“`;
  const file = page.pageimage;
  if (!/\.jpe?g$/i.test(file)) return `kein JPEG (${file})`;
  const info = Object.values((await api('commons.wikimedia.org', {
    action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(WIDTH),
  })).query.pages)[0]?.imageinfo?.[0];
  if (!info) return `nicht auf Commons (${file})`;
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  if (!OK_LICENSE.test(license)) return `Lizenz nicht geeignet: „${license || 'unbekannt'}“`;
  const img = await fetch(info.thumburl ?? info.url, { headers: UA });
  if (!img.ok) return `Download fehlgeschlagen (HTTP ${img.status})`;
  const rel = `img/photos/${key}.jpg`;
  fs.writeFileSync(path.join(root, 'public', rel), Buffer.from(await img.arrayBuffer()));
  photos[key] = {
    file: rel,
    title: strip(meta.ObjectName?.value) || file.replace(/_/g, ' '),
    author: strip(meta.Artist?.value).slice(0, 120) || 'unbekannt',
    license,
    ...(meta.LicenseUrl?.value ? { licenseUrl: meta.LicenseUrl.value } : {}),
    source: info.descriptionurl,
  };
  return null;
}

let ok = 0;
const skipped = [];
for (const [key, title] of Object.entries(sources)) {
  if (key.startsWith('_')) continue;
  if (photos[key] && !force && fs.existsSync(path.join(root, 'public', photos[key].file))) { ok++; continue; }
  try {
    const problem = await one(key, title);
    if (problem) skipped.push(`${key}: ${problem}`);
    else ok++;
  } catch (e) {
    skipped.push(`${key}: ${e.message}`);
  }
  await sleep(150);
}
fs.writeFileSync(outFile, JSON.stringify(Object.fromEntries(Object.entries(photos).sort()), null, 1) + '\n');
console.log(`${ok} Fotos vorhanden, ${skipped.length} übersprungen`);
for (const s of skipped) console.log('  – ' + s);
