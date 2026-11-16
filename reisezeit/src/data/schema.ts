import { z } from 'zod';

export const climateCodes = ['G', 'L', 'Y', 'R'] as const;
/** G = beste Zeit · L = gut & ruhiger · Y = mittel · R = schlecht */
export const ClimateCode = z.enum(climateCodes);
export type ClimateCode = z.infer<typeof ClimateCode>;

/** Genau 12 Zeichen aus G/L/Y/R, Januar bis Dezember */
export const Months12 = z.string().regex(/^[GLYR]{12}$/, 'Klima-Code braucht genau 12 Zeichen aus G/L/Y/R');
export type Months12 = string;

export const continents = ['Asien', 'Afrika', 'Südamerika', 'Europa'] as const;
export const Continent = z.enum(continents);
export type Continent = z.infer<typeof Continent>;

export const interestIds = [
  'strand', 'surfen', 'tauchen', 'berge', 'kultur', 'food',
  'natur', 'nightlife', 'ruhe', 'abenteuer', 'city', 'stays',
] as const;
export const InterestId = z.enum(interestIds);
export type InterestId = z.infer<typeof InterestId>;

export const sceneIds = [
  'beach', 'lagoon', 'temple', 'mountain', 'safari', 'desert',
  'city', 'rice', 'fjord', 'snow', 'coast', 'saltflat', 'jungle',
] as const;
export const SceneId = z.enum(sceneIds);
export type SceneId = z.infer<typeof SceneId>;

export const tagIds = ['waves', 'temple', 'mountain', 'paw', 'fish', 'city', 'snow', 'wind', 'leaf', 'sun', 'tent', 'storm', 'surf'] as const;
export const TagId = z.enum(tagIds);
export type TagId = z.infer<typeof TagId>;

export const Region = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  climate: Months12,
  note: z.string(),
});
export type Region = z.infer<typeof Region>;

export const Country = z.object({
  id: z.string().regex(/^[a-z]{2}$/),
  name: z.string().min(1),
  continent: Continent,
  group: z.string().min(1),
  scene: SceneId,
  tags: z.array(TagId),
  intro: z.string(),
  regions: z.array(Region).min(1),
});
export type Country = z.infer<typeof Country>;

const Strength = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const PlaceEvent = z.object({
  month: z.number().int().min(0).max(11),
  name: z.string(),
  interest: InterestId.optional(),
  overridesRain: z.boolean().optional(),
});
export type PlaceEvent = z.infer<typeof PlaceEvent>;

export const Place = z.object({
  id: z.string().regex(/^[a-z0-9]+$/),
  name: z.string().min(1),
  countryId: z.string(),
  regionId: z.string(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  climate: Months12.optional(),
  crowd: z.string().regex(/^[0-3]{12}$/, 'crowd braucht genau 12 Ziffern 0–3'),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  interests: z.record(InterestId, Strength),
  tip: z.string(),
  stays: z.object({ budget: z.string(), komfort: z.string(), luxus: z.string() }),
  events: z.array(PlaceEvent).optional(),
  transport: z.object({
    airport: z.boolean(),
    intlAirport: z.boolean().optional(),
    rail: z.boolean(),
    island: z.boolean(),
  }),
  flightHoursFromDE: z.number().positive().max(40),
  closedMonths: z.array(z.number().int().min(0).max(11)).optional(),
  malaria: z.boolean().optional(),
  maxTempC: z.array(z.number()).length(12).optional(),
  safety: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
export type Place = z.infer<typeof Place>;

export const Interest = z.object({ id: InterestId, label: z.string(), icon: z.string() });
export type Interest = z.infer<typeof Interest>;
