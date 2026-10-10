// Erzeugt die PWA-Icons als PNG ohne externe Abhängigkeiten.
// Aufruf: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const LIME = [0xc6, 0xf4, 0x32];
const BLACK = [0, 0, 0];

// Kurzhantel, 45 Grad gedreht (normierte Koordinaten 0..1, abgerundete Rechtecke [x0, y0, x1, y1, Radius]).
// Liegt vollständig in der Safe-Zone maskierbarer Icons.
const shapes = [
  [0.3, 0.465, 0.7, 0.535, 0.02], // Stange
  [0.27, 0.27, 0.355, 0.73, 0.035], // innere Scheiben
  [0.645, 0.27, 0.73, 0.73, 0.035],
  [0.185, 0.34, 0.265, 0.66, 0.03], // äußere Scheiben
  [0.735, 0.34, 0.815, 0.66, 0.03],
  [0.15, 0.455, 0.19, 0.545, 0.015], // Endkappen
  [0.81, 0.455, 0.85, 0.545, 0.015],
];

const ANGLE = (-45 * Math.PI) / 180;

function inside([x0, y0, x1, y1, r], px, py) {
  // Punkt zurückdrehen, dann gegen das ungedrehte Rechteck prüfen
  const dx = px - 0.5;
  const dy = py - 0.5;
  const x = 0.5 + dx * Math.cos(-ANGLE) - dy * Math.sin(-ANGLE);
  const y = 0.5 + dx * Math.sin(-ANGLE) + dy * Math.cos(-ANGLE);
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, scale = 1) {
  const ss = 4;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = ((x + (sx + 0.5) / ss) / size - 0.5) / scale + 0.5;
          const v = ((y + (sy + 0.5) / ss) / size - 0.5) / scale + 0.5;
          if (shapes.some((s) => inside(s, u, v))) hits++;
        }
      }
      const a = hits / (ss * ss);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(BLACK[k] * (1 - a) + LIME[k] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bit-Tiefe
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.85));
writeFileSync('public/icons/apple-touch-icon.png', png(180));
console.log('Icons erzeugt.');
