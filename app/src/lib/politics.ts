/** Feature politiche caricate nel client (stesso file usato come sorgente della mappa). */
import type { PoliticalFeatureProps } from './schema';
import { dataUrl } from './data';

type Pos = [number, number];
export interface PolGeom {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: Pos[][] | Pos[][][];
}
export interface PoliticsFC {
  type: 'FeatureCollection';
  features: { type: 'Feature'; properties: PoliticalFeatureProps; geometry: PolGeom }[];
}

export async function loadPolitics(): Promise<PoliticsFC> {
  const res = await fetch(dataUrl('politics.geojson'));
  if (!res.ok) throw new Error(`politics.geojson: HTTP ${res.status}`);
  return (await res.json()) as PoliticsFC;
}

export function pointInPolygonGeometry(pt: Pos, g: PolGeom | null): boolean {
  if (!g) return false;
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Pos[][][];
  for (const poly of polys) {
    let inside = false;
    for (const ring of poly)
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
          inside = !inside;
      }
    if (inside) return true;
  }
  return false;
}

/** Feature visibili nell'anno t nella modalità data (stessa logica dei filtri MapLibre). */
export function visibleAt(fc: PoliticsFC, t: number, mode: 'de_facto' | 'de_jure') {
  return fc.features.filter(
    (f) =>
      f.properties.start_year <= t &&
      t < f.properties.end_year &&
      (f.properties.layer === 'cliopatria' ||
        f.properties.mode === mode ||
        f.properties.mode === 'claim' ||
        f.properties.mode === 'occupation'),
  );
}
