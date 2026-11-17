import { useEffect, useState } from 'react';
import isoNumeric from '../data/isoNumeric.json';
import { WORLD_BY_CODE } from '../data/world';

interface Shape { code: string | null; name: string; d: string }
let cache: Promise<Shape[]> | null = null;

const W = 1000;
const LAT_TOP = 84, LAT_BOTTOM = -58;
const H = Math.round((W * (LAT_TOP - LAT_BOTTOM)) / 360);
const px = (lon: number) => (((lon + 180) / 360) * W).toFixed(1);
const py = (lat: number) => (((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * H).toFixed(1);

/** Ländergrenzen (Natural Earth 110m, gemeinfrei) – erst bei Bedarf geladen */
function loadShapes(): Promise<Shape[]> {
  cache ??= Promise.all([import('world-atlas/countries-110m.json'), import('topojson-client')]).then(([topo, tc]) => {
    const data = (topo as { default?: unknown }).default ?? topo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = tc.feature(data as any, (data as any).objects.countries) as unknown as GeoJSON.FeatureCollection;
    const codes = isoNumeric as Record<string, string>;
    return fc.features
      .filter((f) => f.id !== '010') // ohne Antarktis
      .map((f) => {
        const name = String((f.properties as { name?: string } | null)?.name ?? '');
        const code = codes[String(f.id ?? '').padStart(3, '0')] ?? (name === 'Kosovo' ? 'XK' : null);
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
        // Ringe über der Datumsgrenze (Russland, Fidschi) würden als Streifen quer über die Karte laufen:
        // solche Ringe einmal nach Osten verschoben und einmal nach Westen zeichnen, der Rand schneidet ab.
        const ringPath = (ring: number[][], shift: number) =>
          'M' + ring.map(([lo, la]) => `${px(lo + shift)} ${py(la)}`).join('L') + 'Z';
        const d = polys
          .flatMap((poly) => poly.flatMap((ring) => {
            const lons = ring.map((pt) => pt[0]);
            if (Math.max(...lons) - Math.min(...lons) <= 180) return [ringPath(ring, 0)];
            const east = ring.map(([lo, la]) => [lo < 0 ? lo + 360 : lo, la]);
            return [ringPath(east, 0), ringPath(east, -360)];
          }))
          .join('');
        return { code, name: (code && WORLD_BY_CODE.get(code)?.name) || name, d };
      });
  });
  return cache;
}

interface Props {
  visited: string[];
  /** zweites Profil für den Vergleich */
  other?: string[];
  onToggle?(code: string): void;
  label: string;
}

/**
 * Weltkarte zum „Freirubbeln“: bereiste Länder sind eingefärbt, ein Klick markiert ein Land.
 * Die Länderliste darunter bleibt der Weg für Tastatur und Screenreader.
 */
export function WorldMap({ visited, other, onToggle, label }: Props) {
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadShapes().then((s) => alive && setShapes(s)).catch(() => alive && setShapes([]));
    return () => { alive = false; };
  }, []);
  const mine = new Set(visited);
  const theirs = new Set(other ?? []);

  return (
    <div className="worldmap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <rect width={W} height={H} fill="#DCEBF2" rx="10" />
        {(shapes ?? []).map((s, i) => {
          const a = !!s.code && mine.has(s.code);
          const b = !!s.code && theirs.has(s.code);
          const cls = a && b ? 'both' : a ? 'mine' : b ? 'theirs' : '';
          const can = !!onToggle && !!s.code && WORLD_BY_CODE.has(s.code);
          return (
            <path key={i} d={s.d} className={`land ${cls}${can ? ' can' : ''}`} aria-hidden="true"
              onClick={can ? () => onToggle!(s.code!) : undefined}>
              <title>{s.name}{a ? ' – bereist' : ''}</title>
            </path>
          );
        })}
      </svg>
      {!shapes && <p className="small mute" style={{ margin: '6px 0 0' }}>Karte lädt …</p>}
    </div>
  );
}
