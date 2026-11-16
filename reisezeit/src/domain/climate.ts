import type { ClimateCode, Months12, Place, Region } from '../data/schema';
import { MONTHS } from '../i18n/de';

export const RANK: Record<ClimateCode, number> = { G: 4, L: 3, Y: 2, R: 1 };

export const codeAt = (code: Months12, month: number) => code[month] as ClimateCode;

/** Klima-Code eines Orts: eigener Code oder der seiner Region */
export function climateOf(place: Place, regions: Map<string, Region>): Months12 {
  if (place.climate) return place.climate;
  const r = regions.get(place.regionId);
  if (!r) throw new Error(`Region ${place.regionId} fehlt`);
  return r.climate;
}

/** Bester Code je Monat über mehrere Regionen (für die Länderkachel) */
export function aggregate(codes: Months12[]): Months12 {
  let out = '';
  for (let m = 0; m < 12; m++) {
    let best: ClimateCode = 'R';
    for (const c of codes) if (RANK[c[m] as ClimateCode] > RANK[best]) best = c[m] as ClimateCode;
    out += best;
  }
  return out;
}

/** "GGLYYYYYRRGG", "G" → "Nov–Feb" (mit Umbruch über den Jahreswechsel) */
export function ranges(code: Months12, which: ClimateCode): string {
  return monthRanges(monthsWith(code, which));
}

export function monthsWith(code: Months12, which: ClimateCode): number[] {
  const out: number[] = [];
  for (let i = 0; i < 12; i++) if (code[i] === which) out.push(i);
  return out;
}

/** Monatsliste → "Nov–Feb, Jun" */
export function monthRanges(idx: number[]): string {
  if (!idx.length) return '–';
  if (idx.length === 12) return 'ganzjährig';
  const set = new Set(idx);
  // Beginn eines Blocks suchen, dessen Vormonat nicht dazugehört
  const start = idx.find((i) => !set.has((i + 11) % 12)) ?? idx[0];
  const out: string[] = [];
  let i = start;
  let seen = 0;
  while (seen < 12) {
    if (set.has(i)) {
      const a = i;
      let b = i;
      while (set.has((b + 1) % 12) && (b + 1) % 12 !== a) {
        b = (b + 1) % 12;
        seen++;
      }
      out.push(a === b ? MONTHS[a] : `${MONTHS[a]}–${MONTHS[b]}`);
      i = (b + 1) % 12;
      seen++;
    } else {
      i = (i + 1) % 12;
      seen++;
    }
  }
  return out.join(', ');
}

/** Monate, in denen alle Regionen Y oder R sind und mindestens eine R */
export function badMonths(codes: Months12[]): string {
  const idx: number[] = [];
  for (let m = 0; m < 12; m++) {
    const allBad = codes.every((c) => c[m] === 'R' || c[m] === 'Y');
    const anyR = codes.some((c) => c[m] === 'R');
    if (allBad && anyR) idx.push(m);
  }
  return idx.length ? monthRanges(idx) : 'kein Monat überall schlecht';
}

/** "Beste Zeit: Dez–Mär · ruhiger: Apr, Nov" */
export function summary(code: Months12): string {
  const l = ranges(code, 'L');
  return `Beste Zeit: ${ranges(code, 'G')}${l !== '–' ? ` · ruhiger: ${l}` : ''}`;
}
