/**
 * Layer Cliopatria (src-cliopatria, CC BY 4.0): filtro per finestra, ritaglio, semplificazione,
 * mappatura alle polity dell'atlante. Gli anni Cliopatria sono usati così come sono (ToYear inclusivo
 * → end_year esclusivo = ToYear + 1); per gli anni a.C. può esserci uno scarto di un anno rispetto
 * alla numerazione astronomica, perché il dataset non documenta la convenzione.
 */
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import mapshaper from 'mapshaper';
import type {
  Certainty,
  CliopatriaMapEntry,
  Family,
  PoliticalFeatureProps,
} from '../../app/src/lib/schema.ts';
import { polityColor, stateColor } from '../../app/src/lib/colors.ts';
import { bbox, bboxIntersects, simplifyGeometry, type PolyGeom } from './geo.ts';
import { RAW } from './io.ts';

export interface ClioProps {
  Name: string;
  FromYear: number;
  ToYear: number;
  Area: number;
  Type: string;
  Wikipedia: string;
  Wikidata: string;
  SeshatID: string;
  Components: string;
  MemberOf: string;
}
export interface ClioFeature {
  type: 'Feature';
  properties: ClioProps;
  geometry: PolyGeom;
}
export interface Feature<P = Record<string, unknown>> {
  type: 'Feature';
  properties: P;
  geometry: PolyGeom | null;
}

export function loadCliopatria(): ClioFeature[] {
  const zip = unzipSync(fs.readFileSync(path.join(RAW, 'cliopatria.geojson.zip')));
  const name = Object.keys(zip).find((n) => n.endsWith('.geojson'));
  if (!name) throw new Error('GeoJSON non trovato nello zip Cliopatria');
  const fc = JSON.parse(new TextDecoder().decode(zip[name])) as { features: ClioFeature[] };
  return fc.features;
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export interface Mapped {
  polity_id: string;
  name: string;
  family: Family;
  kind: string;
  tint_offset: number;
  external: boolean;
  auto: boolean;
}

export function mapRow(p: ClioProps, map: CliopatriaMapEntry[]): Mapped {
  const m = map.find(
    (e) =>
      e.name === p.Name &&
      (e.start_year === undefined || p.FromYear >= e.start_year) &&
      (e.end_year === undefined || p.FromYear < e.end_year),
  );
  if (m)
    return {
      polity_id: m.polity_id,
      name: m.name_it,
      family: m.family,
      kind: m.kind,
      tint_offset: m.tint_offset ?? 0,
      external: !!m.external,
      auto: false,
    };
  return {
    polity_id: `clio-${slug(p.Name)}`,
    name: p.Name,
    family: 'neutro',
    kind: 'state',
    tint_offset: 0,
    external: false,
    auto: true,
  };
}

/** Regola editoriale di certezza per i poligoni Cliopatria (il dataset non la fornisce). */
export function clioCertainty(p: ClioProps, kind: string): Certainty {
  if (kind === 'people' || p.ToYear < -500) return 'low';
  return 'medium';
}

async function clip(features: ClioFeature[], win: number[]): Promise<ClioFeature[]> {
  const out = await mapshaper.applyCommands(`-i in.json -clip bbox=${win.join(',')} -o out.json`, {
    'in.json': { type: 'FeatureCollection', features },
  });
  return (JSON.parse(out['out.json']!.toString()) as { features: ClioFeature[] }).features;
}

export interface ClioLayerOptions {
  window: number[];
  tolerance: number;
  minKm2: number;
  digits: number;
  filter?: (m: Mapped, p: ClioProps) => boolean;
  fidPrefix: string;
}

export async function buildClioLayer(
  rows: ClioFeature[],
  map: CliopatriaMapEntry[],
  o: ClioLayerOptions,
): Promise<Feature<PoliticalFeatureProps>[]> {
  const candidates = rows.filter((f) => {
    if (!f.geometry || f.properties.Type !== 'POLITY' || f.properties.Name.startsWith('(')) return false;
    if (!bboxIntersects(bbox(f.geometry), o.window)) return false;
    return o.filter ? o.filter(mapRow(f.properties, map), f.properties) : true;
  });
  // ordinamento deterministico prima del ritaglio
  candidates.sort(
    (a, b) =>
      a.properties.FromYear - b.properties.FromYear || a.properties.Name.localeCompare(b.properties.Name),
  );
  const clipped = await clip(candidates, o.window);
  const out: Feature<PoliticalFeatureProps>[] = [];
  clipped.forEach((f, i) => {
    if (!f.geometry) return;
    const g = simplifyGeometry(f.geometry, o.tolerance, o.minKm2, o.digits);
    if (!g) return;
    const p = f.properties;
    const m = mapRow(p, map);
    const c = polityColor(m.family, m.polity_id, 0, m.tint_offset);
    const sc = stateColor(m.polity_id);
    out.push({
      type: 'Feature',
      geometry: g,
      properties: {
        fid: `${o.fidPrefix}${i}`,
        layer: 'cliopatria',
        polity_id: m.polity_id,
        name: m.name,
        start_year: p.FromYear,
        end_year: p.ToYear + 1,
        mode: 'de_facto',
        family: m.family,
        depth: m.tint_offset,
        fill: c.fill,
        border: c.border,
        fill_state: sc.fill,
        border_state: sc.border,
        certainty: clioCertainty(p, m.kind),
        source: 'src-cliopatria',
        ...(p.Wikidata ? { wikidata: p.Wikidata } : {}),
        ...(p.Wikipedia ? { wikipedia: p.Wikipedia } : {}),
        ...(p.MemberOf ? { member_of: p.MemberOf } : {}),
      },
    });
  });
  return out;
}

/** Contorni del composito "(Holy Roman Empire)" per la linea di sovranità nominale (§9.1 p. 4). */
export async function buildHreOutline(rows: ClioFeature[], win: number[]): Promise<Feature[]> {
  const cand = rows
    .filter(
      (f) =>
        f.geometry && f.properties.Name === '(Holy Roman Empire)' && bboxIntersects(bbox(f.geometry), win),
    )
    .sort((a, b) => a.properties.FromYear - b.properties.FromYear);
  const clipped = await clip(cand, win);
  const out: Feature[] = [];
  for (const f of clipped) {
    if (!f.geometry) continue;
    const g = simplifyGeometry(f.geometry, 0.01, 50, 3);
    if (!g) continue;
    out.push({
      type: 'Feature',
      geometry: g,
      properties: {
        polity_id: 'sacro-romano-impero',
        name: 'Sacro Romano Impero (sovranità nominale)',
        start_year: f.properties.FromYear,
        end_year: f.properties.ToYear + 1,
        source: 'src-cliopatria',
      },
    });
  }
  return out;
}
