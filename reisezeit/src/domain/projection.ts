import type { LatLon } from './geo';

export interface Projection {
  x(lon: number): number;
  y(lat: number): number;
  W: number;
  H: number;
  /** sichtbarer Ausschnitt in Grad (mit Rand) */
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number };
}

/**
 * Stopps in einen W × H-Rahmen einpassen (wie buildMap() im Mockup), Längengrade linear umgerechnet.
 * Längengrade werden mit cos(mittlere Breite) gestaucht, damit Formen nicht zu breit wirken.
 */
export function makeProjection(points: LatLon[], W = 640, H = 440, pad = 70): Projection {
  const lats = points.map((p) => p.lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((p) => p.lon * k);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...lats), maxY = Math.max(...lats);
  const cX = (minX + maxX) / 2, cY = (minY + maxY) / 2;
  const span = Math.max(maxY - minY, ((maxX - minX) * H) / W, 3);
  const sc = (H - 2 * pad) / span;
  const x = (lon: number) => W / 2 + (lon * k - cX) * sc;
  const y = (lat: number) => H / 2 - (lat - cY) * sc;
  const halfW = W / 2 / sc, halfH = H / 2 / sc;
  return {
    x, y, W, H,
    bounds: { minLon: (cX - halfW) / k, maxLon: (cX + halfW) / k, minLat: cY - halfH, maxLat: cY + halfH },
  };
}

/** Bogen für Flugstrecken: quadratische Kurve, seitlich versetzt */
export function arc(x1: number, y1: number, x2: number, y2: number, bend = 0.18) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const cx = mx - (y2 - y1) * bend, cy = my + (x2 - x1) * bend;
  return { cx, cy, midX: (x1 + 2 * cx + x2) / 4, midY: (y1 + 2 * cy + y2) / 4 };
}

/** Zwischenpunkte einer Bogenlinie (für Leaflet), in Grad */
export function arcPoints(a: LatLon, b: LatLon, steps = 24, bend = 0.18): [number, number][] {
  const c = arc(a.lon, a.lat, b.lon, b.lat, -bend);
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lon = (1 - t) ** 2 * a.lon + 2 * (1 - t) * t * c.cx + t ** 2 * b.lon;
    const lat = (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * c.cy + t ** 2 * b.lat;
    out.push([lat, lon]);
  }
  return out;
}
