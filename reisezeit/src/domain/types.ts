import type { Country, InterestId, Months12, Place, Region } from '../data/schema';

export type Area = 'Südostasien' | 'Asien' | 'Südamerika' | 'Europa' | 'Afrika';
export type RegionFilter = 'Alle' | 'Südostasien' | 'Südamerika' | 'Europa' | 'Afrika';
export type Pace = 'slow' | 'mid' | 'fast';
export type Style = 'budget' | 'komfort' | 'luxus';
export type Party = 'solo' | 'paar' | 'familie' | 'freunde';
export type TripDays = 7 | 10 | 14 | 21;

export interface Exclusions { noLongHaul: boolean; noHeat: boolean; noMalaria: boolean }

export interface Inputs {
  month: number; // 0–11
  days: number;
  interests: InterestId[];
  mustHave?: InterestId;
  region: RegionFilter;
  pace: Pace;
  style: Style;
  party: Party;
  exclusions: Exclusions;
}

/** Zugriff auf Stammdaten, den die reinen Funktionen brauchen */
export interface Ctx {
  climate(p: Place): Months12;
  area(p: Place): Area;
  country(p: Place): Country;
  region(p: Place): Region;
  place(id: string): Place | undefined;
  places: Place[];
}

export interface ScoreParts { W: number; P: number; A: number; B: number; F: number; E: number }

export interface Scored {
  place: Place;
  total: number;
  parts: ScoreParts;
  reasons: string;
}

export interface Stop { placeId: string; nights: number }
