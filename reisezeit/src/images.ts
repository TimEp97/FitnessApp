// Bilder für Länder und Orte: ein lizenziertes Foto (src/data/photos.json, geladen mit
// scripts/fetch-photos.mjs), sonst eine der Landschafts-Illustrationen.
import photosJson from './data/photos.json';
import type { Country, Place, SceneId } from './data/schema';

export interface PhotoCredit { file: string; author: string; license: string; licenseUrl?: string; source: string; title?: string }
export interface ImageRef { src: string; isPhoto: boolean; credit?: PhotoCredit }

export const PHOTOS = photosJson as Record<string, PhotoCredit>;

const scene = (id: SceneId): ImageRef => ({ src: `img/scenes/${id}.svg`, isPhoto: false });
const photo = (key: string): ImageRef | null => (PHOTOS[key] ? { src: PHOTOS[key].file, isPhoto: true, credit: PHOTOS[key] } : null);

export function countryImage(c: Country): ImageRef {
  return photo(`c-${c.id}`) ?? scene(c.scene);
}

/** Passende Illustration nach Art des Orts */
export function sceneForPlace(p: Place, c: Country): SceneId {
  const has = (k: keyof Place['interests']) => (p.interests[k] ?? 0) >= 2;
  const special: SceneId[] = ['fjord', 'snow', 'saltflat', 'desert', 'safari'];
  if (has('city') && !has('strand')) return 'city';
  if (special.includes(c.scene)) return c.scene;
  if (p.transport.island) return has('tauchen') ? 'lagoon' : 'beach';
  if (has('strand')) return c.continent === 'Europa' ? 'coast' : 'beach';
  if (has('berge')) return 'mountain';
  if (has('kultur')) return c.continent === 'Europa' ? 'coast' : 'temple';
  if (has('natur')) return c.scene === 'rice' || c.scene === 'temple' ? 'rice' : 'jungle';
  return c.scene;
}

export function placeImage(p: Place, c: Country): ImageRef {
  return photo(p.id) ?? scene(sceneForPlace(p, c));
}

/** Alle Bildnachweise (für Impressum und PDF) */
export function allCredits(): (PhotoCredit & { key: string })[] {
  return Object.entries(PHOTOS).map(([key, v]) => ({ key, ...v }));
}
