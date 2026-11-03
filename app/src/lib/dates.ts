/**
 * Date: anni astronomici interni (1 a.C. = 0), visualizzazione "a.C./d.C." (RF-TIME-01),
 * parsing minimo di EDTF (livelli 0-1: YYYY, YYYY-MM, YYYY-MM-DD, suffissi ~ ? %, intervalli [a..b]).
 */

/** Anno astronomico → etichetta storica. 0 → "1 a.C.", -499 → "500 a.C.", 1454 → "1454". */
export function formatYear(astro: number, opts: { era?: 'always' | 'auto' } = {}): string {
  if (astro <= 0) return `${1 - astro} a.C.`;
  return opts.era === 'always' ? `${astro} d.C.` : `${astro}`;
}

/** Etichetta storica → anno astronomico. Accetta "500 a.C.", "500 BC", "-499", "1454", "1454 d.C.". */
export function parseYear(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const bc = /^(\d{1,4}) ?(a\.? ?c\.?|bc|bce|av\.? ?c\.?)$/.exec(s);
  if (bc?.[1]) return 1 - parseInt(bc[1], 10);
  const ad = /^(\d{1,4}) ?(d\.? ?c\.?|ad|ce)?$/.exec(s);
  if (ad?.[1]) return parseInt(ad[1], 10);
  const astro = /^-?\d{1,4}$/.exec(s);
  if (astro) return parseInt(s, 10);
  return null;
}

/**
 * Converte una data storica (anno con segno "storico": -500 = 500 a.C., senza anno zero)
 * in anno astronomico. Le tabelle della manualistica usano spesso questa forma.
 */
export function historicalToAstro(year: number): number {
  if (year === 0) throw new Error("l'anno 0 non esiste nella numerazione storica");
  return year < 0 ? year + 1 : year;
}

export interface EdtfInfo {
  start: number;
  end: number;
  approximate: boolean;
  uncertain: boolean;
}

/** Interpreta l'anno di una stringa EDTF (anni EDTF = astronomici, come da specifica ISO 8601-2). */
export function parseEdtfYear(edtf: string): EdtfInfo | null {
  const s = edtf.trim();
  const range =
    /^\[(-?\d{1,4})[^\]]*\.\.(-?\d{1,4})[^\]]*\]$/.exec(s) ?? /^(-?\d{1,4})[^/]*\/(-?\d{1,4}).*$/.exec(s);
  if (range?.[1] && range[2]) {
    return {
      start: parseInt(range[1], 10),
      end: parseInt(range[2], 10),
      approximate: s.includes('~') || s.includes('%'),
      uncertain: true,
    };
  }
  const m = /^(-?\d{1,4})(-\d{2})?(-\d{2})?([~?%])?$/.exec(s);
  if (!m?.[1]) return null;
  const y = parseInt(m[1], 10);
  const q = m[4];
  return { start: y, end: y, approximate: q === '~' || q === '%', uncertain: q === '?' || q === '%' };
}

/** Formatta una data EDTF in italiano (es. "1454-04-09" → "9 aprile 1454"; "1240~" → "c. 1240"). */
const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

export function formatEdtf(edtf: string): string {
  const m = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?([~?%])?$/.exec(edtf.trim());
  if (!m?.[1]) return edtf;
  const y = formatYear(parseInt(m[1], 10));
  const month = m[2] ? MONTHS[parseInt(m[2], 10) - 1] : undefined;
  const day = m[3] ? parseInt(m[3], 10) : undefined;
  let out = day && month ? `${day} ${month} ${y}` : month ? `${month} ${y}` : y;
  if (m[4] === '~' || m[4] === '%') out = `c. ${out}`;
  if (m[4] === '?' || m[4] === '%') out = `${out} (?)`;
  return out;
}

/** Vero se l'anno t è nell'intervallo [start, end). */
export const inInterval = (t: number, r: { start_year: number; end_year: number }) =>
  r.start_year <= t && t < r.end_year;

/**
 * Formatta un intervallo [start, end) come "1450–1466": la fine è l'anno del cambiamento
 * (da quell'anno la mappa mostra già la situazione successiva). Le date future mostrano «oggi».
 */
export function formatInterval(start: number, end: number): string {
  return `${formatYear(start)}–${end > new Date().getFullYear() ? 'oggi' : formatYear(end)}`;
}
