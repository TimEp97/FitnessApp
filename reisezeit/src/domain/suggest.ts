import { filterPlaces, type Relaxation } from './filter';
import { rankPlaces, scorePlace } from './score';
import type { Ctx, Inputs, Scored } from './types';

export interface Suggestions {
  ranked: Scored[];
  relaxed: Relaxation[];
  /** Eingaben nach eventuellem Lockern */
  inputs: Inputs;
}

/** Filtern → bewerten → Rangliste mit Vielfalt */
export function suggest(inp: Inputs, ctx: Ctx): Suggestions {
  const { places, inputs, relaxed } = filterPlaces(inp, ctx);
  const ranked = rankPlaces(places.map((p) => scorePlace(p, inputs, ctx)));
  return { ranked, relaxed, inputs };
}
