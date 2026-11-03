/**
 * Schema cromatico (REQUIREMENTS §9).
 * - famiglia di colore = sovrano supremo;
 * - tinta più chiara al crescere della profondità di dipendenza;
 * - bordo scuro nel colore della famiglia, con contrasto ≥ 3:1 sul riempimento (WCAG SC 1.4.11).
 * Le conversioni OKLCH ↔ sRGB seguono le formule di Björn Ottosson (https://bottosson.github.io/posts/oklab/).
 */
import type { Family } from './schema';

export interface FamilyInfo {
  label: string;
  anchor: string;
  /** true se l'ancora non viene dalla palette Paul Tol "muted" e va validata per il daltonismo. */
  toValidate: boolean;
}

export const FAMILIES: Record<Family, FamilyInfo> = {
  roma: { label: 'Roma', anchor: '#882255', toValidate: false },
  bisanzio: { label: 'Bisanzio', anchor: '#332288', toValidate: false },
  longobardi: { label: 'Longobardi', anchor: '#999933', toValidate: false },
  'regno-italia-sri': { label: "Regno d'Italia medievale / SRI", anchor: '#DDCC77', toValidate: false },
  papato: { label: 'Papato', anchor: '#AA4499', toValidate: false },
  islam: { label: 'Islam (Sicilia, Bari, Ifriqiya)', anchor: '#117733', toValidate: false },
  'sicilia-napoli': { label: 'Regno di Sicilia / Napoli', anchor: '#44AA99', toValidate: false },
  'aragona-spagna': { label: 'Aragona / Spagna', anchor: '#CC6677', toValidate: false },
  francia: { label: 'Francia', anchor: '#88CCEE', toValidate: false },
  austria: { label: 'Austria / Asburgo', anchor: '#A6761D', toValidate: true },
  venezia: { label: 'Venezia', anchor: '#B2182B', toValidate: true },
  genova: { label: 'Genova', anchor: '#4477AA', toValidate: false },
  milano: { label: 'Milano (Visconti, Sforza)', anchor: '#4F8A3C', toValidate: true },
  firenze: { label: 'Firenze / Stato mediceo', anchor: '#C2703D', toValidate: true },
  'savoia-italia': { label: "Savoia → Regno d'Italia", anchor: '#1F4E9E', toValidate: true },
  indipendenti: { label: 'Indipendenti minori', anchor: '#8C8C7A', toValidate: true },
  'popoli-preromani': { label: 'Popoli preromani', anchor: '#9C7E5C', toValidate: true },
  greci: { label: 'Greci (poleis, Magna Grecia)', anchor: '#5C8FA8', toValidate: true },
  cartagine: { label: 'Fenici / Cartagine', anchor: '#7B5A9C', toValidate: true },
  goti: { label: 'Goti, Vandali e regni romano-barbarici', anchor: '#8E6B3E', toValidate: true },
  franchi: { label: 'Franchi / Carolingi', anchor: '#5E7F3A', toValidate: true },
  germania: { label: 'Regni germanici e SRI transalpino', anchor: '#6F6F3A', toValidate: true },
  ottomani: { label: 'Impero ottomano', anchor: '#3F7F6F', toValidate: true },
  britannici: { label: 'Impero britannico', anchor: '#9E4A6A', toValidate: true },
  svizzera: { label: 'Confederazione svizzera', anchor: '#8A5A44', toValidate: true },
  neutro: { label: 'Altri stati', anchor: '#8A8A8A', toValidate: true },
};

export const MISSING_FILL = '#DDDDDD';

// ---------------------------------------------------------------- conversioni

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m || !m[1]) throw new Error(`colore non valido: ${hex}`);
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: C, h };
}

function oklchToLinearRgb({ l: L, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Converte in hex riducendo la crominanza finché il colore rientra nel gamut sRGB. */
export function oklchToHex(color: Oklch): string {
  let c = color.c;
  for (let i = 0; i < 40; i++) {
    const rgb = oklchToLinearRgb({ ...color, c });
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) {
      return (
        '#' +
        rgb
          .map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255))
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')
      );
    }
    c *= 0.9;
  }
  return '#808080';
}

/** Luminanza relativa WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------------------------------------------------------------- algoritmo §9.3

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Rotazione di tonalità di ±8° per distinguere "fratelli" della stessa famiglia. */
export function siblingOffset(polityId: string): number {
  return [-8, -4, 0, 4, 8][hashString(polityId) % 5] ?? 0;
}

/** Luminosità minima del riempimento per famiglie che, schiarite, si confonderebbero (scelta da validare). */
const FILL_MIN_L: Partial<Record<Family, number>> = { venezia: 0.68, 'savoia-italia': 0.72 };

/** Per la famiglia "neutro": 6 tonalità poco sature scelte in modo deterministico dall'id. */
const NEUTRAL_HUES = [30, 90, 150, 210, 270, 330];

export interface PolityColor {
  fill: string;
  border: string;
}

export function polityColor(family: Family, polityId: string, depth = 0, tintOffset = 0): PolityColor {
  const base = hexToOklch(FAMILIES[family].anchor);
  let hue = base.h + siblingOffset(polityId);
  let chroma = base.c;
  if (family === 'neutro') {
    hue = NEUTRAL_HUES[hashString(polityId) % NEUTRAL_HUES.length] ?? 0;
    chroma = 0.045;
  }
  const d = Math.min(3, depth + tintOffset);
  const minL = FILL_MIN_L[family] ?? 0.76;
  const fillL = Math.min(0.93, Math.max(minL, base.l) + d * 0.05);
  const fillC = Math.min(chroma, family === 'venezia' ? 0.15 : 0.12) * (1 - d * 0.25);
  const fill = oklchToHex({ l: fillL, c: Math.max(0.01, fillC), h: hue });
  // Bordo: scurito finché non raggiunge 3:1 sul proprio riempimento.
  let borderL = Math.min(base.l, 0.5);
  let border = oklchToHex({ l: borderL, c: Math.min(chroma, 0.16), h: hue });
  while (contrastRatio(border, fill) < 3.2 && borderL > 0.15) {
    borderL -= 0.03;
    border = oklchToHex({ l: borderL, c: Math.min(chroma, 0.16), h: hue });
  }
  return { fill, border };
}

/**
 * Livello L1 «Stati»: ogni entità ha una tonalità propria (qualitativa, deterministica dall'id),
 * indipendente dalla famiglia di sovranità.
 */
export function stateColor(polityId: string): PolityColor {
  const hue = (hashString(polityId) % 24) * 15;
  const fill = oklchToHex({ l: 0.85, c: 0.075, h: hue });
  let l = 0.5;
  let border = oklchToHex({ l, c: 0.1, h: hue });
  while (contrastRatio(border, fill) < 3.2 && l > 0.15) {
    l -= 0.03;
    border = oklchToHex({ l, c: 0.1, h: hue });
  }
  return { fill, border };
}
