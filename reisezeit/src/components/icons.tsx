import {
  BedDouble, Building2, Bus, Car, Check, CloudLightning, CloudRain, CloudSun, Fish, Flower2, Landmark,
  Leaf, Moon, Mountain, PawPrint, Plane, Sailboat, Ship, Snowflake, Sun, Tent, TrainFront,
  UtensilsCrossed, Waves, Wind, type LucideIcon,
} from 'lucide-react';
import type { ClimateCode, InterestId, TagId } from '../data/schema';
import type { TransportKind } from '../domain/transport';

export const TAG_ICON: Record<TagId, LucideIcon> = {
  waves: Waves, temple: Landmark, mountain: Mountain, paw: PawPrint, fish: Fish, city: Building2,
  snow: Snowflake, wind: Wind, leaf: Leaf, sun: Sun, tent: Tent, storm: CloudLightning, surf: Sailboat,
};

export const INTEREST_ICON: Record<InterestId, LucideIcon> = {
  strand: Waves, surfen: Sailboat, tauchen: Fish, berge: Mountain, kultur: Landmark, food: UtensilsCrossed,
  natur: Leaf, nightlife: Moon, ruhe: Flower2, abenteuer: Tent, city: Building2, stays: BedDouble,
};

export const TRANSPORT_ICON: Record<TransportKind, LucideIcon> = {
  flug: Plane, zug: TrainFront, bus: Bus, faehre: Ship, auto: Car,
};

export const TRANSPORT_COLOR: Record<TransportKind, string> = {
  flug: 'var(--t-flug)', faehre: 'var(--t-faehre)', zug: 'var(--t-land)', bus: 'var(--t-land)', auto: 'var(--t-land)',
};
/** Für Leaflet/SVG, wo CSS-Variablen nicht überall greifen */
export const TRANSPORT_HEX: Record<TransportKind, string> = {
  flug: '#C25E1F', faehre: '#1E6FB8', zug: '#0F5C52', bus: '#0F5C52', auto: '#0F5C52',
};
export const TRANSPORT_DASH: Record<TransportKind, string | undefined> = {
  flug: '6 5', faehre: '2 6', zug: undefined, bus: undefined, auto: undefined,
};

export const CODE_ICON: Record<ClimateCode, LucideIcon> = { G: Sun, L: Check, Y: CloudSun, R: CloudRain };
