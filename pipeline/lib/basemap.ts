/** Basemap fisica neutra da Natural Earth (src-ne, pubblico dominio) — RF-MAP-02. */
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import type { Feature } from './cliopatria.ts';
import { clipLines, linesOf, simplifyGeometry, simplifyLine, type LineGeom, type PolyGeom } from './geo.ts';
import { RAW } from './io.ts';

const read = (n: string) =>
  JSON.parse(fs.readFileSync(path.join(RAW, n), 'utf8')) as {
    features: { properties: Record<string, unknown>; geometry: PolyGeom & LineGeom }[];
  };

async function clipPolys(
  file: string,
  win: number[],
  tol: number,
  minKm2: number,
  digits: number,
  filter?: (p: Record<string, unknown>) => boolean,
) {
  const src = read(file).features.filter((f) => f.geometry && (!filter || filter(f.properties)));
  const out = await mapshaper.applyCommands(`-i in.json -clip bbox=${win.join(',')} -o out.json`, {
    'in.json': {
      type: 'FeatureCollection',
      features: src.map((f, i) => ({ type: 'Feature', geometry: f.geometry, properties: { i } })),
    },
  });
  const fc = JSON.parse(out['out.json']!.toString()) as { features: Feature[] };
  const feats: Feature[] = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const g = simplifyGeometry(f.geometry, tol, minKm2, digits);
    if (g) feats.push({ type: 'Feature', geometry: g, properties: {} });
  }
  return { type: 'FeatureCollection', features: feats };
}

function clipLineFile(
  file: string,
  win: number[],
  tol: number,
  filter: (p: Record<string, unknown>) => boolean,
  props: (p: Record<string, unknown>) => Record<string, unknown>,
) {
  const feats: unknown[] = [];
  for (const f of read(file).features) {
    if (!f.geometry || !filter(f.properties)) continue;
    const parts = clipLines(linesOf(f.geometry), win)
      .map((l) => simplifyLine(l, tol))
      .filter((l) => l.length > 1);
    if (parts.length)
      feats.push({
        type: 'Feature',
        properties: props(f.properties),
        geometry: { type: 'MultiLineString', coordinates: parts },
      });
  }
  return { type: 'FeatureCollection', features: feats };
}

export async function buildBasemap(mainWin: number[], extWin: number[]) {
  const landMain = await clipPolys('ne_10m_land.geojson', mainWin, 0.002, 1, 3);
  const landExt = await clipPolys('ne_10m_land.geojson', extWin, 0.03, 200, 2);
  const lakes = await clipPolys('ne_10m_lakes.geojson', mainWin, 0.002, 2, 3);
  const rivers = clipLineFile(
    'ne_10m_rivers_lake_centerlines.geojson',
    mainWin,
    0.003,
    (p) => Number(p.scalerank ?? 99) <= 8 && p.featurecla !== 'Lake Centerline',
    (p) => ({ name: String(p.name ?? ''), scalerank: Number(p.scalerank ?? 9) }),
  );
  const borders = clipLineFile(
    'ne_10m_admin_0_boundary_lines_land.geojson',
    mainWin,
    0.002,
    () => true,
    () => ({}),
  );
  return { landMain, landExt, lakes, rivers, borders };
}
