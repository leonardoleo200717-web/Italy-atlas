/** Utilità geometriche minime e deterministiche per la pipeline (nessuna dipendenza esterna). */
export type Pos = [number, number];
export type Ring = Pos[];
export type PolygonCoords = Ring[];
export interface PolyGeom {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: PolygonCoords | PolygonCoords[];
}

export function polygonsOf(g: PolyGeom | null | undefined): PolygonCoords[] {
  if (!g) return [];
  return g.type === 'Polygon' ? [g.coordinates as PolygonCoords] : (g.coordinates as PolygonCoords[]);
}

export function bbox(g: PolyGeom): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polygonsOf(g))
    for (const ring of poly)
      for (const [x, y] of ring) {
        if (x < b[0]) b[0] = x;
        if (y < b[1]) b[1] = y;
        if (x > b[2]) b[2] = x;
        if (y > b[3]) b[3] = y;
      }
  return b;
}

export const bboxIntersects = (a: number[], b: number[]) =>
  !(a[2]! < b[0]! || a[0]! > b[2]! || a[3]! < b[1]! || a[1]! > b[3]!);

/** Area planare (gradi²) con segno di un anello. */
export function ringArea(r: Ring): number {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j]![0] - r[i]![0]) * (r[j]![1] + r[i]![1]);
  return s / 2;
}

/** Area approssimata in km² (correzione per la latitudine media). */
export function ringAreaKm2(r: Ring): number {
  const lat = r.reduce((s, p) => s + p[1], 0) / Math.max(1, r.length);
  return Math.abs(ringArea(r)) * 111.32 * 111.32 * Math.cos((lat * Math.PI) / 180);
}

function sqSegDist(p: Pos, a: Pos, b: Pos): number {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/** Douglas-Peucker iterativo su un anello chiuso. */
export function simplifyRing(ring: Ring, tol: number): Ring {
  if (ring.length <= 4) return ring;
  const sq = tol * tol;
  const last = ring.length - 1;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[last] = 1;
  // spezza l'anello nel punto più lontano dal primo per evitare il caso degenere (primo = ultimo)
  let far = 1;
  let farD = -1;
  for (let i = 1; i < last; i++) {
    const d = (ring[i]![0] - ring[0]![0]) ** 2 + (ring[i]![1] - ring[0]![1]) ** 2;
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  keep[far] = 1;
  const stack: [number, number][] = [
    [0, far],
    [far, last],
  ];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = sqSegDist(ring[i]!, ring[a]!, ring[b]!);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx > 0 && maxD > sq) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

const q = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/**
 * Semplifica e quantizza una geometria poligonale; elimina anelli degeneri e isole sotto `minKm2`.
 * Restituisce null se non resta nulla.
 */
export function simplifyGeometry(g: PolyGeom, tol: number, minKm2: number, digits = 3): PolyGeom | null {
  const out: PolygonCoords[] = [];
  for (const poly of polygonsOf(g)) {
    const rings: Ring[] = [];
    poly.forEach((ring, k) => {
      let r = simplifyRing(ring, tol).map((p) => [q(p[0], digits), q(p[1], digits)] as Pos);
      r = r.filter((p, i) => i === 0 || p[0] !== r[i - 1]![0] || p[1] !== r[i - 1]![1]);
      if (r.length < 4) return;
      if (k === 0 && ringAreaKm2(r) < minKm2) return;
      if (k > 0 && ringAreaKm2(r) < minKm2 / 2) return;
      if (k > 0 && rings.length === 0) return; // buco senza esterno
      rings.push(r);
    });
    if (rings.length) out.push(rings);
  }
  if (!out.length) return null;
  return out.length === 1
    ? { type: 'Polygon', coordinates: out[0]! }
    : { type: 'MultiPolygon', coordinates: out };
}

/** Punto nel poligono (regola pari-dispari, buchi inclusi). */
export function pointInGeometry(pt: Pos, g: PolyGeom | null | undefined): boolean {
  for (const poly of polygonsOf(g)) {
    let inside = false;
    for (const ring of poly) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
          inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

/** Douglas-Peucker su una linea aperta. */
export function simplifyLine(line: Pos[], tol: number, digits = 3): Pos[] {
  if (line.length <= 2) return line.map((p) => [q(p[0], digits), q(p[1], digits)] as Pos);
  const sq = tol * tol;
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = sqSegDist(line[i]!, line[a]!, line[b]!);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx > 0 && maxD > sq) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return line.filter((_, i) => keep[i]).map((p) => [q(p[0], digits), q(p[1], digits)] as Pos);
}

export interface LineGeom {
  type: 'LineString' | 'MultiLineString';
  coordinates: Pos[] | Pos[][];
}

export function linesOf(g: LineGeom): Pos[][] {
  return g.type === 'LineString' ? [g.coordinates as Pos[]] : (g.coordinates as Pos[][]);
}

/** Ritaglia linee a un rettangolo (scarta i segmenti esterni, spezza le linee). */
export function clipLines(lines: Pos[][], b: number[]): Pos[][] {
  const inside = (p: Pos) => p[0] >= b[0]! && p[0] <= b[2]! && p[1] >= b[1]! && p[1] <= b[3]!;
  const out: Pos[][] = [];
  for (const l of lines) {
    let cur: Pos[] = [];
    for (const p of l) {
      if (inside(p)) cur.push(p);
      else if (cur.length) {
        if (cur.length > 1) out.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) out.push(cur);
  }
  return out;
}
