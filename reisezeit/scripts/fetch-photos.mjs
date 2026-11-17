// Lädt frei lizenzierte Fotos von Wikimedia Commons für Länder und Orte und schreibt die
// Bildnachweise nach src/data/photos.json.
//
// Aufruf:  node scripts/fetch-photos.mjs [--force]
// Hinter einem Proxy (Node ≥ 22.21):  NODE_USE_ENV_PROXY=1 node scripts/fetch-photos.mjs
//
// Quelle je Bild: Hauptbild des englischen Wikipedia-Artikels aus scripts/photo-sources.json.
// Übernommen werden nur JPEGs von Commons mit Lizenz CC0, Public Domain, CC BY oder CC BY-SA; alles
// andere wird übersprungen (dann bleibt die Illustration). Autor, Lizenz und Quelle werden gespeichert
// und im Impressum sowie im PDF als Bildnachweis ausgegeben.
// Braucht Netzzugriff auf en.wikipedia.org, commons.wikimedia.org und upload.wikimedia.org.
// Wikimedia drosselt Abfragen: Die Lizenzdaten werden deshalb gebündelt (40 Dateien je Anfrage) geholt.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/photo-sources.json'), 'utf8'));
const outFile = path.join(root, 'src/data/photos.json');
const imgDir = path.join(root, 'public/img/photos');
const force = process.argv.includes('--force');
const UA = { 'User-Agent': 'ReisezeitPhotoFetch/1.0 (static travel app build script)' };
const OK_LICENSE = /^(cc0|cc[ -]by(-sa)?[ -]\d|public domain|pd)/i;
const WIDTH = 1280;

fs.mkdirSync(imgDir, { recursive: true });
const photos = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const save = () => fs.writeFileSync(outFile, JSON.stringify(Object.fromEntries(Object.entries(photos).sort()), null, 1) + '\n');

/** Abruf mit Wartezeit bei Drosselung (HTTP 429) */
async function get(url, tries = 6) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429 || i >= tries) return res;
    const wait = Number(res.headers.get('retry-after') ?? 0) * 1000 || 20_000;
    console.log(`  … gedrosselt, warte ${Math.round(wait / 1000)} s`);
    await sleep(wait + 1000);
  }
}

const skipped = [];
const todo = Object.entries(sources).filter(
  ([key]) => !key.startsWith('_') && (force || !photos[key] || !fs.existsSync(path.join(root, 'public', photos[key].file))),
);
console.log(`${todo.length} Bilder zu laden`);

// 1. Hauptbild je Artikel – gebündelt, 50 Titel je Anfrage
const fileOf = new Map(); // key → Dateiname auf Commons
const titles = [...new Set(todo.map(([, title]) => title))];
const imageOfTitle = new Map(); // angefragter Titel → Dateiname
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50);
  const params = new URLSearchParams({
    action: 'query', format: 'json', redirects: '1', prop: 'pageimages', piprop: 'name', pilimit: '50', titles: batch.join('|'),
  });
  const res = await get(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) { console.log(`  Wikipedia-Abfrage fehlgeschlagen (HTTP ${res.status})`); continue; }
  const q = (await res.json()).query ?? {};
  // Weg vom angefragten Titel zum Seitentitel: erst Normalisierung, dann Weiterleitung
  const step = new Map([...(q.normalized ?? []), ...(q.redirects ?? [])].map((x) => [x.from, x.to]));
  const byPage = new Map(Object.values(q.pages ?? {}).map((pg) => [pg.title, pg.pageimage]));
  for (const t of batch) {
    let cur = t;
    for (let n = 0; n < 4 && step.has(cur); n++) cur = step.get(cur);
    if (byPage.get(cur)) imageOfTitle.set(t, byPage.get(cur));
  }
  await sleep(2000);
}
for (const [key, title] of todo) {
  const file = imageOfTitle.get(title);
  if (!file) { skipped.push(`${key}: kein Hauptbild im Artikel „${title}“`); continue; }
  if (!/\.jpe?g$/i.test(file)) { skipped.push(`${key}: kein JPEG (${file})`); continue; }
  fileOf.set(key, file);
}
console.log(`${fileOf.size} Hauptbilder gefunden`);

// 2. Lizenz, Autor und Bildadresse gebündelt von Commons
const infoOf = new Map(); // Dateiname → imageinfo
const files = [...new Set(fileOf.values())];
for (let i = 0; i < files.length; i += 40) {
  const batch = files.slice(i, i + 40);
  const params = new URLSearchParams({
    action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(WIDTH),
    titles: batch.map((f) => `File:${f}`).join('|'),
  });
  const res = await get(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) { console.log(`  Commons-Abfrage fehlgeschlagen (HTTP ${res.status})`); continue; }
  const data = await res.json();
  const norm = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of Object.values(data.query?.pages ?? {})) {
    const asked = (norm.get(page.title) ?? page.title).replace(/^File:/, '');
    if (page.imageinfo?.[0]) infoOf.set(asked, page.imageinfo[0]);
  }
  await sleep(2000);
}

console.log(`${infoOf.size} Lizenzangaben erhalten`);

// 3. Bilder laden (gleiche Datei für mehrere Schlüssel nur einmal herunterladen)
const done = new Map();
for (const [key, file] of fileOf) {
  const info = infoOf.get(file) ?? infoOf.get(file.replace(/_/g, ' '));
  if (!info) { skipped.push(`${key}: keine Angaben auf Commons (${file})`); continue; }
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  if (!OK_LICENSE.test(license)) { skipped.push(`${key}: Lizenz nicht geeignet: „${license || 'unbekannt'}“`); continue; }
  try {
    if (done.has(file)) {
      const rel0 = `img/photos/${key}.jpg`;
      fs.copyFileSync(path.join(root, 'public', done.get(file).file), path.join(root, 'public', rel0));
      photos[key] = { ...done.get(file), file: rel0 };
      save();
      continue;
    }
    const url = (info.thumburl ?? info.url).replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/').split('?')[0];
    const img = await get(url);
    if (!img.ok) { skipped.push(`${key}: Download fehlgeschlagen (HTTP ${img.status})`); continue; }
    const rel = `img/photos/${key}.jpg`;
    fs.writeFileSync(path.join(root, 'public', rel), Buffer.from(await img.arrayBuffer()));
    photos[key] = {
      file: rel,
      title: strip(meta.ObjectName?.value) || file.replace(/_/g, ' ').replace(/\.jpe?g$/i, ''),
      author: strip(meta.Artist?.value).slice(0, 120) || 'unbekannt',
      license,
      ...(meta.LicenseUrl?.value ? { licenseUrl: meta.LicenseUrl.value } : {}),
      source: info.descriptionurl,
    };
    done.set(file, photos[key]);
    save();
  } catch (e) {
    skipped.push(`${key}: ${e.message}`);
  }
  await sleep(400);
}
save();
console.log(`${Object.keys(photos).length} Fotos vorhanden, ${skipped.length} übersprungen`);
for (const s of skipped) console.log('  – ' + s);
