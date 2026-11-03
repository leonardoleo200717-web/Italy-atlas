import fs from 'node:fs';
import path from 'node:path';
import { pointInGeometry, type PolyGeom } from '../../pipeline/lib/geo.ts';
import type { PoliticalFeatureProps } from '../../app/src/lib/schema.ts';

interface F {
  properties: PoliticalFeatureProps;
  geometry: PolyGeom;
}
let cache: F[] | null = null;
export function politics(): F[] {
  cache ??= (
    JSON.parse(fs.readFileSync(path.resolve('public/data/politics.geojson'), 'utf8')) as { features: F[] }
  ).features;
  return cache;
}

/**
 * Entità visibile in (lon, lat) nell'anno t, con la stessa precedenza della mappa:
 * il layer curato (sopra) vince su Cliopatria. mode: de_facto | de_jure.
 */
export function whoAt(t: number, lon: number, lat: number, mode: 'de_facto' | 'de_jure' = 'de_facto') {
  const hits = politics().filter(
    (f) =>
      f.properties.start_year <= t &&
      t < f.properties.end_year &&
      (f.properties.layer === 'cliopatria' ? true : f.properties.mode === mode) &&
      pointInGeometry([lon, lat], f.geometry),
  );
  const curated = hits.filter((h) => h.properties.layer === 'curated');
  return (curated.length ? curated : hits).map((h) => h.properties);
}
