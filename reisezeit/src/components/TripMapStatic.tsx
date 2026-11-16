import { useEffect, useMemo, useState } from 'react';
import type { Plan } from '../domain/timeline';
import { arc, makeProjection } from '../domain/projection';
import { TRANSPORT_DASH, TRANSPORT_HEX } from './icons';

type Ring = [number, number][];
let landCache: Promise<Ring[]> | null = null;

/** Vereinfachte Küstenlinien (Natural Earth 110m, gemeinfrei) – erst bei Bedarf geladen */
export function loadLand(): Promise<Ring[]> {
  landCache ??= Promise.all([import('world-atlas/land-110m.json'), import('topojson-client')]).then(([topo, tc]) => {
    const data = (topo as { default?: unknown }).default ?? topo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = tc.feature(data as any, (data as any).objects.land) as unknown as GeoJSON.FeatureCollection;
    const rings: Ring[] = [];
    for (const f of fc.features) {
      const g = f.geometry;
      if (g.type === 'Polygon') g.coordinates.forEach((r) => rings.push(r as Ring));
      if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => poly.forEach((r) => rings.push(r as Ring)));
    }
    return rings;
  });
  return landCache;
}

/** Reine SVG-Karte: scharf im PDF, braucht keine Kartenkacheln von fremden Servern */
export function TripMapStatic({ plan, height, width: W = 640, ratio = 440 / 640 }: { plan: Plan; height?: number | string; width?: number; ratio?: number }) {
  const [land, setLand] = useState<Ring[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadLand().then((r) => alive && setLand(r)).catch(() => alive && setLand([]));
    return () => { alive = false; };
  }, []);

  const view = useMemo(() => {
    if (!plan.places.length) return null;
    const pr = makeProjection(plan.places, W, Math.round(W * ratio), Math.round(Math.min(70, W * ratio * 0.16)));
    const { minLon, maxLon, minLat, maxLat } = pr.bounds;
    const m = 5;
    const landPaths = (land ?? [])
      .filter((ring) => ring.some(([lo, la]) => lo > minLon - m && lo < maxLon + m && la > minLat - m && la < maxLat + m))
      .map((ring) => 'M' + ring.map(([lo, la]) => `${pr.x(lo).toFixed(1)} ${pr.y(la).toFixed(1)}`).join('L') + 'Z');
    const lines = plan.legs.map((l) => {
      const x1 = pr.x(l.from.lon), y1 = pr.y(l.from.lat), x2 = pr.x(l.to.lon), y2 = pr.y(l.to.lat);
      const kind = l.chosen.kind;
      if (kind === 'flug') {
        const c = arc(x1, y1, x2, y2);
        return { d: `M${x1} ${y1}Q${c.cx} ${c.cy} ${x2} ${y2}`, kind };
      }
      return { d: `M${x1} ${y1}L${x2} ${y2}`, kind };
    });
    const pins = plan.places.map((p, i) => {
      const x = pr.x(p.lon), y = pr.y(p.lat);
      const right = x < pr.W - 150;
      return { x, y, n: i + 1, name: p.name, lx: right ? x + 18 : x - 18, anchor: right ? 'start' : 'end' };
    });
    return { pr, landPaths, lines, pins };
  }, [plan, land, W, ratio]);

  if (!view) return null;
  const aria = `Karte der Route: ${plan.places.map((p, i) => `${i + 1}. ${p.name}`).join(', ')}`;
  return (
    <svg viewBox={`0 0 ${view.pr.W} ${view.pr.H}`} role="img" aria-label={aria} style={{ display: 'block', width: '100%', height: height ?? 'auto' }} preserveAspectRatio={height ? "xMidYMid slice" : "xMidYMid meet"}>
      <defs>
        <clipPath id="map-clip"><rect width={view.pr.W} height={view.pr.H} /></clipPath>
      </defs>
      <rect width={view.pr.W} height={view.pr.H} fill="#DCEBF2" />
      <g clipPath="url(#map-clip)">
        {view.landPaths.map((d, i) => (
          <path key={i} d={d} fill="#F1F4EF" stroke="#B8C7C3" strokeWidth={1} />
        ))}
        {view.lines.map((l, i) => (
          <path key={i} d={l.d} stroke={TRANSPORT_HEX[l.kind]} strokeWidth={3} strokeDasharray={TRANSPORT_DASH[l.kind]} fill="none" strokeLinecap="round" />
        ))}
        {view.pins.map((p) => (
          <g key={p.n}>
            <circle cx={p.x} cy={p.y} r={12} fill="#0F5C52" stroke="#FFFFFF" strokeWidth={2.5} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={12} fontWeight={700} fill="#FFFFFF">{p.n}</text>
            <text x={p.lx} y={p.y + 5} textAnchor={p.anchor} fontFamily="Inter, sans-serif" fontSize={14} fontWeight={700} fill="#13201E"
              style={{ paintOrder: 'stroke' }} stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round">{p.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function MapLegend() {
  const item = (kind: 'bus' | 'flug' | 'faehre', label: string) => (
    <span>
      <svg width="26" height="6" aria-hidden="true"><path d="M1 3h24" stroke={TRANSPORT_HEX[kind]} strokeWidth={3} strokeDasharray={kind === 'faehre' ? '2 5' : TRANSPORT_DASH[kind]} strokeLinecap="round" /></svg>
      {label}
    </span>
  );
  return (
    <div className="map-legend">
      {item('bus', 'Zug, Bus, Auto')}
      {item('flug', 'Flug')}
      {item('faehre', 'Fähre')}
    </div>
  );
}
