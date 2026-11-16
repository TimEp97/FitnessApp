import interests from '../data/interests.json';
import type { InterestId } from '../data/schema';

/** Anzeigenamen der Vorlieben (aus interests.json) */
export const INTEREST_LABEL = Object.fromEntries(
  (interests as { id: InterestId; label: string }[]).map((i) => [i.id, i.label]),
) as Record<InterestId, string>;
