/**
 * `npm run data:build [-- --strict]` — pipeline completa (REQUIREMENTS §6.3):
 * validate → Cliopatria (L1) → UTA (topologia, resolve, dissolve) → etichette → basemap → index → manifest.
 * Output in public/data. Formato MVP: GeoJSON (alternativa ammessa da §5 finché < ~5 MB per layer);
 * PMTiles via tippecanoe resta il passo successivo quando i dati cresceranno.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import type { Family, PoliticalFeatureProps } from '../app/src/lib/schema.ts';
import { loadCurated, polityIds, printIssues, validate } from './lib/curated.ts';
import { buildClioLayer, buildHreOutline, loadCliopatria, mapRow, type Feature } from './lib/cliopatria.ts';
import { buildCuratedLayer, buildUnitGeometries } from './lib/uta.ts';
import { buildBasemap } from './lib/basemap.ts';
import { OUT, RAW, log, readJson, writeJson } from './lib/io.ts';

/** Finestra principale (RF-MAP-01, con margine) e finestra degli "orizzonti esterni" (RF-MAP-04). */
export const MAIN_WINDOW = [-1, 34, 26, 49];
export const EXT_WINDOW = [-12, 20, 46, 56];

const t0 = Date.now();
const strict = process.argv.includes('--strict');
const { data: d, issues: parseIssues } = loadCurated();
const issues = [...parseIssues, ...validate(d, { strict })];
printIssues(issues.filter((i) => i.level === 'error'));
if (issues.some((i) => i.level === 'error')) {
  console.error('Validazione fallita: build interrotta (RNF-07).');
  process.exit(1);
}
log(`validazione ok (${issues.length} avvisi)`);

// ------------------------------------------------------------------ Cliopatria
const rows = loadCliopatria();
log(`Cliopatria: ${rows.length} righe`);
const clioMain = await buildClioLayer(rows, d.cliopatriaMap, {
  window: MAIN_WINDOW,
  tolerance: 0.008,
  minKm2: 20,
  digits: 3,
  fidPrefix: 'c',
});
const clioExt = await buildClioLayer(rows, d.cliopatriaMap, {
  window: EXT_WINDOW,
  tolerance: 0.04,
  minKm2: 400,
  digits: 2,
  fidPrefix: 'x',
  filter: (m) => m.external,
});
const hre = await buildHreOutline(rows, MAIN_WINDOW);
log(
  `Cliopatria: ${clioMain.length} feature principali, ${clioExt.length} esterne, ${hre.length} contorni SRI`,
);

// ------------------------------------------------------------------ polity index
interface PolityInfo {
  id: string;
  names: { lang: string; name: string }[];
  kind: string;
  family: Family;
  tint_offset: number;
  start_year: number;
  end_year: number;
  government: { type: string; start_year: number; end_year: number }[];
  capitals: { place_id: string; start_year: number; end_year: number }[];
  predecessors: string[];
  successors: string[];
  wikidata?: string;
  wikipedia?: string;
  cliopatria_names: string[];
  certainty: string;
  sources: { id: string; loc?: string; note?: string }[];
  note?: string;
  curated: boolean;
}
const polities = new Map<string, PolityInfo>();
for (const p of d.polities)
  polities.set(p.id, {
    id: p.id,
    names: p.names,
    kind: p.kind,
    family: p.family,
    tint_offset: p.tint_offset,
    start_year: p.start_year,
    end_year: p.end_year,
    government: p.government,
    capitals: p.capitals,
    predecessors: p.predecessors,
    successors: p.successors,
    ...(p.wikidata ? { wikidata: p.wikidata } : {}),
    cliopatria_names: [],
    certainty: p.certainty,
    sources: p.sources,
    ...(p.note ? { note: p.note } : {}),
    curated: true,
  });
const wdCount = new Map<string, Map<string, number>>();
for (const r of rows) {
  const p = r.properties;
  if (p.Type !== 'POLITY' || p.Name.startsWith('(')) continue;
  const m = mapRow(p, d.cliopatriaMap);
  if (m.auto && !clioMain.some((f) => f.properties.polity_id === m.polity_id)) continue;
  let info = polities.get(m.polity_id);
  if (!info) {
    info = {
      id: m.polity_id,
      names: [{ lang: 'it', name: m.name }, ...(m.name !== p.Name ? [{ lang: 'en', name: p.Name }] : [])],
      kind: m.kind,
      family: m.family,
      tint_offset: m.tint_offset,
      start_year: p.FromYear,
      end_year: p.ToYear + 1,
      government: [],
      capitals: [],
      predecessors: [],
      successors: [],
      cliopatria_names: [],
      certainty: 'medium',
      sources: [{ id: 'src-cliopatria', loc: `entità «${p.Name}»` }],
      curated: false,
    };
    polities.set(m.polity_id, info);
  } else if (!info.curated) {
    info.start_year = Math.min(info.start_year, p.FromYear);
    info.end_year = Math.max(info.end_year, p.ToYear + 1);
  }
  if (!info.cliopatria_names.includes(p.Name)) info.cliopatria_names.push(p.Name);
  if (p.Wikipedia && !info.wikipedia) info.wikipedia = p.Wikipedia;
  if (p.Wikidata) {
    const c = wdCount.get(info.id) ?? new Map<string, number>();
    c.set(p.Wikidata, (c.get(p.Wikidata) ?? 0) + 1);
    wdCount.set(info.id, c);
  }
}
for (const [id, c] of wdCount) {
  const info = polities.get(id)!;
  if (!info.wikidata) info.wikidata = [...c.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}
const familyOf = (id: string): { family: Family; tint: number } => {
  const p = polities.get(id);
  return p ? { family: p.family, tint: p.tint_offset } : { family: 'neutro', tint: 0 };
};

// ------------------------------------------------------------------ UTA
const unitGeoms = await buildUnitGeometries(d);
const curated = await buildCuratedLayer(d, unitGeoms, familyOf);
log(`UTA: ${unitGeoms.length} unità, ${curated.length} feature curate`);

// ------------------------------------------------------------------ etichette
const politics: Feature<PoliticalFeatureProps>[] = [...clioMain, ...curated];
async function labelPoints(feats: Feature<PoliticalFeatureProps>[]) {
  const input = feats
    .filter((f) => f.properties.mode === 'de_facto' || f.properties.mode === 'de_jure')
    .map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        fid: f.properties.fid,
        layer: f.properties.layer,
        name: f.properties.name,
        start_year: f.properties.start_year,
        end_year: f.properties.end_year,
        mode: f.properties.mode,
        depth: f.properties.depth,
        border: f.properties.border,
        kind: polities.get(f.properties.polity_id)?.kind ?? 'state',
      },
    }));
  const out = await mapshaper.applyCommands('-i in.json -points inner -o out.json precision=0.001', {
    'in.json': { type: 'FeatureCollection', features: input },
  });
  return JSON.parse(out['out.json']!.toString()) as { features: Feature[] };
}
const labels = await labelPoints(politics);
// Le etichette Cliopatria che cadono dentro le UTA restano nascoste negli anni del layer curato.
{
  const { pointInGeometry } = await import('./lib/geo.ts');
  const from = Math.min(...d.units.map((u) => u.valid_from));
  const to = Math.max(...d.units.map((u) => u.valid_to));
  for (const l of labels.features) {
    const pt = (l.geometry as unknown as { coordinates: [number, number] }).coordinates;
    if (l.properties.layer === 'cliopatria' && unitGeoms.some((u) => pointInGeometry(pt, u.geometry))) {
      l.properties.covered_from = from;
      l.properties.covered_to = to;
    }
  }
}

// ------------------------------------------------------------------ basemap
const base = await buildBasemap(MAIN_WINDOW, EXT_WINDOW);

// ------------------------------------------------------------------ luoghi
const places = readJson<{
  features: { properties: { name: string; adm0_a3: string }; geometry: { coordinates: [number, number] } }[];
}>(path.join(RAW, 'ne_10m_populated_places_simple.geojson'));
const resolvedPlaces = d.places.map((p) => {
  if (p.ne_name) {
    const f = places.features.find((x) => x.properties.name === p.ne_name);
    if (!f) throw new Error(`luogo NE non trovato: ${p.ne_name}`);
    return { ...p, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
  }
  return p;
});

// ------------------------------------------------------------------ scrittura
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const sizes: Record<string, number> = {};
const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features });
const put = (name: string, obj: unknown) => {
  sizes[name] = writeJson(path.join(OUT, name), obj);
};
put('politics.geojson', fc(politics));
put('external.geojson', fc(clioExt));
put('hre.geojson', fc(hre));
put('labels.geojson', labels);
put('units.geojson', fc(unitGeoms));
put('land.geojson', base.landMain);
put('land-ext.geojson', base.landExt);
put('lakes.geojson', base.lakes);
put('rivers.geojson', base.rivers);
put('borders-modern.geojson', base.borders);

const pids = polityIds(d);
const usedPolities = [...polities.values()].filter(
  (p) =>
    p.curated ||
    pids.has(p.id) ||
    politics.some((f) => f.properties.polity_id === p.id) ||
    clioExt.some((f) => f.properties.polity_id === p.id),
);
put('atlas.json', {
  polities: usedPolities.sort((a, b) => a.id.localeCompare(b.id)),
  relations: d.relations,
  reigns: d.reigns,
  persons: d.persons,
  events: [...d.events].sort((a, b) => a.date_edtf.localeCompare(b.date_edtf) || a.id.localeCompare(b.id)),
  eras: d.eras,
  snapshots: [...d.snapshots].sort((a, b) => a.year - b.year),
  places: resolvedPlaces,
  units: d.units.map((u) => ({ id: u.id, name: u.name, certainty: u.certainty, note: u.note })),
  sources: d.sources,
});

const lock = readJson<{ file: string; url: string; source: string; sha256: string }[]>(
  path.join(RAW, 'sources.lock.json'),
);
const sha = (n: string) =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(OUT, n)))
    .digest('hex');
put('manifest.json', {
  generated_by: 'pipeline/build.ts',
  schema_version: 1,
  inputs: lock,
  outputs: Object.keys(sizes).map((name) => ({ file: name, bytes: sizes[name], sha256: sha(name) })),
  licenses: [
    {
      files: ['politics.geojson', 'external.geojson', 'hre.geojson', 'labels.geojson'],
      content: 'Confini Cliopatria (layer cliopatria)',
      license: 'CC BY 4.0',
      source: 'src-cliopatria',
    },
    {
      files: ['politics.geojson', 'labels.geojson', 'atlas.json'],
      content: "Dati curati dell'atlante (layer curated, possessi, regni, eventi)",
      license: 'CC BY-SA 4.0',
      source: 'atlas',
    },
    {
      files: [
        'units.geojson',
        'land.geojson',
        'land-ext.geojson',
        'lakes.geojson',
        'rivers.geojson',
        'borders-modern.geojson',
      ],
      content: 'Natural Earth',
      license: 'Pubblico dominio',
      source: 'src-ne',
    },
  ],
  sources: d.sources,
  stats: {
    features_cliopatria: clioMain.length,
    features_curated: curated.length,
    features_external: clioExt.length,
    units: unitGeoms.length,
    polities: usedPolities.length,
    persons: d.persons.length,
    reigns: d.reigns.length,
    events: d.events.length,
    draft_records: issues.find((i) => i.msg.includes('review "draft"'))?.msg ?? '0',
  },
});
for (const [n, s] of Object.entries(sizes)) log(`${n.padEnd(24)} ${(s / 1e6).toFixed(2)} MB`);
log(`build completata in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
