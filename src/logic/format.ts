const nf = (max: number, min = 0) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: max, minimumFractionDigits: min });

const nf0 = nf(0);
const nf1 = nf(1);
const nf2 = nf(2);

export function fmtNumber(n: number, decimals = 0): string {
  if (decimals === 0) return nf0.format(n);
  if (decimals === 1) return nf1.format(n);
  return nf2.format(n);
}

/** Gewicht in kg mit Dezimalkomma, ohne überflüssige Nullen: 82,5 */
export function fmtWeight(kg: number): string {
  return nf2.format(kg);
}

/** Volumen: unter 10 t in kg, sonst in Tonnen. */
export function fmtVolume(kg: number): string {
  if (kg >= 10000) return `${nf1.format(kg / 1000)} t`;
  return `${nf0.format(kg)} kg`;
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtMinutes(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

const dateShort = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' });
const dateLong = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const dateMed = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtDateShort = (d: Date | string | number) => dateShort.format(new Date(d));
export const fmtDateLong = (d: Date | string | number) => dateLong.format(new Date(d));
export const fmtDateMed = (d: Date | string | number) => dateMed.format(new Date(d));

/** Akzeptiert „82,5“ und „82.5“. Liefert NaN bei ungültiger Eingabe. */
export function parseNumber(input: string): number {
  const s = input.trim().replace(/\s/g, '').replace(',', '.');
  if (s === '' || !/^-?\d*\.?\d*$/.test(s)) return NaN;
  return Number(s);
}

export function relativeDays(days: number): string {
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}
