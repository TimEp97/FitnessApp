import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_ATTRIBUTION, TILE_URL } from '../config';
import type { Plan } from '../domain/timeline';
import { arcPoints } from '../domain/projection';
import { TRANSPORT_DASH, TRANSPORT_HEX } from './icons';

/** Interaktive Karte (Leaflet + OpenStreetMap) mit nummerierten Stopps und Linien je Verkehrsmittel */
export default function TripMap({ plan }: { plan: Plan }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const l of plan.legs) {
      const kind = l.chosen.kind;
      const pts: [number, number][] =
        kind === 'flug' ? arcPoints(l.from, l.to) : [[l.from.lat, l.from.lon], [l.to.lat, l.to.lon]];
      L.polyline(pts, { color: TRANSPORT_HEX[kind], weight: 3, dashArray: TRANSPORT_DASH[kind], lineCap: 'round' }).addTo(g);
    }
    plan.places.forEach((p, i) => {
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: '', html: `<div class="pin">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        title: `${i + 1}. ${p.name}`,
        keyboard: false,
      })
        .bindTooltip(p.name, { permanent: true, direction: 'right', offset: [14, 0], className: 'pin-label' })
        .addTo(g);
    });
    if (plan.places.length) {
      const b = L.latLngBounds(plan.places.map((p) => [p.lat, p.lon] as [number, number]));
      m.fitBounds(b, { padding: [40, 40], maxZoom: 9 });
    }
  }, [plan]);

  return <div ref={el} className="map-leaflet" role="region" aria-label="Interaktive Karte der Route" />;
}
