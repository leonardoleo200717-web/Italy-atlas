/**
 * Scala temporale non lineare a segmenti (RF-TIME-02): ogni epoca occupa una porzione
 * dello slider proporzionale al suo `weight`, non alla sua durata.
 */
export interface Segment {
  start_year: number;
  end_year: number;
  weight: number;
}

export interface TimeScale {
  min: number;
  max: number;
  /** anno → posizione in [0, 1] */
  toPos(year: number): number;
  /** posizione in [0, 1] → anno intero */
  toYear(pos: number): number;
}

export function linearScale(min: number, max: number): TimeScale {
  return {
    min,
    max,
    toPos: (y) => (Math.min(max, Math.max(min, y)) - min) / (max - min),
    toYear: (p) => Math.round(min + Math.min(1, Math.max(0, p)) * (max - min)),
  };
}

/**
 * Costruisce la scala da segmenti contigui. Le sovrapposizioni tra epoche (es. 535-568 e 476-553)
 * vengono risolte tagliando sui confini ordinati, così la scala resta monotona.
 */
export function segmentedScale(segments: Segment[], min: number, max: number): TimeScale {
  const cuts = Array.from(new Set([min, max, ...segments.flatMap((s) => [s.start_year, s.end_year])]))
    .filter((y) => y >= min && y <= max)
    .sort((a, b) => a - b);
  const pieces: { a: number; b: number; w: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const covering = segments.filter((s) => s.start_year <= a && s.end_year >= b);
    // densità = peso per anno dell'epoca che copre il pezzo (massima se più epoche)
    const density = covering.length
      ? Math.max(...covering.map((s) => s.weight / (s.end_year - s.start_year)))
      : 1 / (max - min);
    pieces.push({ a, b, w: density * (b - a) });
  }
  const total = pieces.reduce((s, p) => s + p.w, 0);
  let acc = 0;
  const table = pieces.map((p) => {
    const r = { ...p, p0: acc / total, p1: (acc + p.w) / total };
    acc += p.w;
    return r;
  });
  return {
    min,
    max,
    toPos(year) {
      const y = Math.min(max, Math.max(min, year));
      const seg = table.find((s) => y >= s.a && y <= s.b) ?? table[table.length - 1]!;
      return seg.p0 + ((y - seg.a) / (seg.b - seg.a)) * (seg.p1 - seg.p0);
    },
    toYear(pos) {
      const p = Math.min(1, Math.max(0, pos));
      const seg = table.find((s) => p >= s.p0 && p <= s.p1) ?? table[table.length - 1]!;
      const f = seg.p1 === seg.p0 ? 0 : (p - seg.p0) / (seg.p1 - seg.p0);
      return Math.round(seg.a + f * (seg.b - seg.a));
    },
  };
}
