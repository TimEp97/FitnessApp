export interface LatLon { lat: number; lon: number }

/** Luftlinie in km (Haversine) */
export function km(a: LatLon, b: LatLon): number {
  const R = 6371;
  const t = Math.PI / 180;
  const dLa = (b.lat - a.lat) * t;
  const dLo = (b.lon - a.lon) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Gesamtlänge eines Wegs über alle Punkte in Reihenfolge */
export function pathKm(points: LatLon[]): number {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += km(points[i - 1], points[i]);
  return s;
}

/** Alle Reihenfolgen (für höchstens 6–7 Elemente gedacht) */
export function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  items.forEach((x, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}
