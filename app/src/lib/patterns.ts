/**
 * Pattern generati a runtime (§9.1 p. 5-7). MapLibre non colora i pattern via SDF, quindi si crea
 * un'immagine per ogni colore richiesto (evento `styleimagemissing`).
 * Id: `hatch-RRGGBB` (pretesa, tratteggio diagonale), `dots-RRGGBB` (occupazione), `uncertain`, `missing`.
 */
export interface PatternImage {
  width: number;
  height: number;
  data: Uint8Array;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function make(
  size: number,
  paint: (x: number, y: number) => [number, number, number, number] | null,
): PatternImage {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const c = paint(x, y);
      if (!c) continue;
      const i = (y * size + x) * 4;
      data.set(c, i);
    }
  return { width: size, height: size, data };
}

export function patternFor(id: string, pixelRatio = 1): PatternImage | null {
  const s = Math.round(12 * pixelRatio);
  const w = Math.max(1, Math.round(2 * pixelRatio));
  let m = /^hatch-([0-9a-f]{6})$/i.exec(id);
  if (m?.[1]) {
    const [r, g, b] = hexRgb(m[1]);
    return make(s, (x, y) => ((x + y) % s < w * 1.2 ? [r, g, b, 230] : null));
  }
  m = /^dots-([0-9a-f]{6})$/i.exec(id);
  if (m?.[1]) {
    const [r, g, b] = hexRgb(m[1]);
    const c = s / 2;
    return make(s, (x, y) =>
      (x - c) ** 2 + (y - c) ** 2 <= (1.6 * pixelRatio) ** 2 ? [r, g, b, 240] : null,
    );
  }
  if (id === 'uncertain') return make(s, (x, y) => ((x - y + s) % s < w ? [110, 110, 110, 120] : null));
  if (id === 'missing') {
    const c = s / 2;
    return make(s, (x, y) =>
      (x - c) ** 2 + (y - c) ** 2 <= (1.2 * pixelRatio) ** 2 ? [150, 150, 150, 255] : [221, 221, 221, 255],
    );
  }
  return null;
}
