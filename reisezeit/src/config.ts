// Kachel-Anbieter für die interaktive Karte. Die öffentlichen OSM-Server sind nur für geringe Last
// gedacht – bei mehr Nutzern hier einen Anbieter mit Vertrag eintragen (z. B. MapTiler, Stadia).
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>';

/** Zustimmung zum Laden der Kartenkacheln merken (nur lokal) */
export const MAP_CONSENT_KEY = 'reisezeit-map-ok';
