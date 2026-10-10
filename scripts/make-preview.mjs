// Baut aus dist-preview/ eine einzelne HTML-Datei (CSS und JS eingebettet) zum Ausprobieren der App.
// Aufruf: npm run build:preview
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';

const dir = 'dist-preview/assets';
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));
if (js.length !== 1) throw new Error(`Erwartet genau eine JS-Datei, gefunden: ${js.join(', ')}`);

const script = readFileSync(`${dir}/${js[0]}`, 'utf8').replace(/<\/script/gi, '<\\/script');
const style = css.map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n').replace(/<\/style/gi, '<\\/style');

const html = `<title>ATHLETIC</title>
<meta name="description" content="ATHLETIC – Krafttraining protokollieren">
<meta name="theme-color" content="#000000">
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;
mkdirSync('preview', { recursive: true });
writeFileSync('preview/athletic.html', html);
console.log(`preview/athletic.html (${Math.round(html.length / 1024)} KB)`);
