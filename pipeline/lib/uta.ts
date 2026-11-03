/**
 * Layer curato a Unità Territoriali Atomiche (REQUIREMENTS §6.1).
 * 1. geometrie delle UTA = unione delle feature Natural Earth admin-1 indicate (dissolve + semplificazione
 *    con topologia condivisa, quindi senza buchi né sovrapposizioni tra UTA);
 * 2. linea del tempo spezzata a ogni cambiamento di possesso o di relazione;
 * 3. per ogni intervallo e modalità, dissolve delle UTA per entità; intervalli consecutivi identici fusi.
 */
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import type { Curated } from './curated.ts';
import type { Feature } from './cliopatria.ts';
import type { Certainty, Family, PoliticalFeatureProps } from '../../app/src/lib/schema.ts';
import { polityColor, stateColor } from '../../app/src/lib/colors.ts';
import { rootSovereign, sovereigntyChain } from '../../app/src/lib/sovereignty.ts';
import type { PolyGeom } from './geo.ts';
import { RAW } from './io.ts';

interface NeFeature {
  type: 'Feature';
  properties: { adm1_code: string };
  geometry: PolyGeom;
}

export async function buildUnitGeometries(d: Curated): Promise<
  Feature<{
    unit_id: string;
    name: string;
    certainty: Certainty;
    note: string;
    valid_from: number;
    valid_to: number;
  }>[]
> {
  const ne = JSON.parse(
    fs.readFileSync(path.join(RAW, 'ne_10m_admin_1_states_provinces.geojson'), 'utf8'),
  ) as {
    features: NeFeature[];
  };
  const byCode = new Map(ne.features.map((f) => [f.properties.adm1_code, f]));
  const feats: unknown[] = [];
  for (const u of d.units)
    for (const code of u.geometry_ref.adm1_codes) {
      const f = byCode.get(code);
      if (!f) throw new Error(`${u.id}: codice admin-1 inesistente ${code}`);
      feats.push({ type: 'Feature', geometry: f.geometry, properties: { unit_id: u.id } });
    }
  const out = await mapshaper.applyCommands(
    '-i in.json -dissolve2 unit_id -simplify interval=600 keep-shapes -o out.json precision=0.0005',
    { 'in.json': { type: 'FeatureCollection', features: feats } },
  );
  const fc = JSON.parse(out['out.json']!.toString()) as { features: Feature<{ unit_id: string }>[] };
  return fc.features
    .map((f) => {
      const u = d.units.find((x) => x.id === f.properties.unit_id)!;
      return {
        ...f,
        properties: {
          unit_id: u.id,
          name: u.name,
          certainty: u.certainty,
          note: u.note ?? '',
          valid_from: u.valid_from,
          valid_to: u.valid_to,
        },
      };
    })
    .sort((a, b) => a.properties.unit_id.localeCompare(b.properties.unit_id));
}

const RANK: Record<Certainty, number> = { high: 0, medium: 1, low: 2, disputed: 3 };
const worst = (a: Certainty, b: Certainty): Certainty => (RANK[a] >= RANK[b] ? a : b);

interface Group {
  polity: string;
  mode: PoliticalFeatureProps['mode'];
  units: string[];
  start: number;
  end: number;
  certainty: Certainty;
  family: Family;
  depth: number;
  fill: string;
  border: string;
  sovereign?: string;
  sources: string[];
}

export async function buildCuratedLayer(
  d: Curated,
  unitGeoms: Feature<{ unit_id: string }>[],
  familyOf: (polityId: string) => { family: Family; tint: number },
): Promise<Feature<PoliticalFeatureProps>[]> {
  const years = new Set<number>();
  for (const p of d.possessions) years.add(p.start_year).add(p.end_year);
  for (const r of d.relations) years.add(r.start_year).add(r.end_year);
  const minY = Math.min(...d.units.map((u) => u.valid_from));
  const maxY = Math.max(...d.units.map((u) => u.valid_to));
  const cuts = [...years].filter((y) => y >= minY && y <= maxY).sort((a, b) => a - b);

  const groups: Group[] = [];
  const open = new Map<string, Group>();

  const colorFor = (polity: string, t: number, mode: 'de_facto' | 'de_jure') => {
    const chain = sovereigntyChain(polity, t, d.relations, mode, { effectiveOnly: true });
    const root = rootSovereign(polity, chain);
    const { family } = familyOf(root);
    const { tint } = familyOf(polity);
    const depth = chain.length;
    const own = polityColor(family, polity, depth, tint);
    const direct = chain[0]?.object;
    const border = direct
      ? polityColor(familyOf(direct).family, direct, depth - 1, familyOf(direct).tint).border
      : own.border;
    return { family, depth: depth + tint, fill: own.fill, border, sovereign: direct };
  };

  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const current = new Map<string, Omit<Group, 'start' | 'end'>>();
    const push = (
      mode: Group['mode'],
      polity: string,
      unit: string,
      cert: Certainty,
      src: string[],
      colorMode: 'de_facto' | 'de_jure',
    ) => {
      const key = `${mode}|${polity}`;
      let g = current.get(key);
      if (!g) {
        g = { polity, mode, units: [], certainty: 'high', sources: [], ...colorFor(polity, a, colorMode) };
        current.set(key, g);
      }
      g.units.push(unit);
      // la certezza del gruppo dipende dai record di possesso; l'approssimazione delle singole UTA
      // è mostrata a parte (overlay delle UTA a certezza bassa)
      g.certainty = worst(g.certainty, cert);
      for (const s of src) if (!g.sources.includes(s)) g.sources.push(s);
    };
    for (const u of d.units) {
      if (a < u.valid_from || a >= u.valid_to) continue;
      const active = d.possessions.filter(
        (p) => p.unit_ids.includes(u.id) && p.start_year <= a && a < p.end_year,
      );
      const df = active.find((p) => p.mode === 'de_facto');
      const dj = active.find((p) => p.mode === 'de_jure') ?? df;
      const srcIds = (p: typeof df) => (p ? p.sources.map((s) => s.id) : []);
      if (df) push('de_facto', df.polity_id, u.id, df.certainty, srcIds(df), 'de_facto');
      if (dj) push('de_jure', dj.polity_id, u.id, dj.certainty, srcIds(dj), 'de_jure');
      for (const c of active.filter((p) => p.mode === 'claim'))
        push('claim', c.polity_id, u.id, c.certainty, srcIds(c), 'de_facto');
    }
    for (const r of d.relations.filter(
      (r) => r.type === 'military_occupation' && r.unit_ids?.length && r.start_year <= a && a < r.end_year,
    ))
      for (const uid of r.unit_ids!)
        push(
          'occupation',
          r.object,
          uid,
          r.certainty,
          r.sources.map((s) => s.id),
          'de_facto',
        );

    // chiusura/estensione dei gruppi aperti
    const seen = new Set<string>();
    for (const [key, g] of current) {
      g.units.sort();
      const sig = `${key}|${g.units.join(',')}|${g.depth}|${g.fill}|${g.border}|${g.certainty}`;
      seen.add(sig);
      const prev = open.get(sig);
      if (prev && prev.end === a) prev.end = b;
      else {
        const ng: Group = { ...g, start: a, end: b };
        groups.push(ng);
        open.set(sig, ng);
      }
    }
    for (const sig of [...open.keys()]) if (!seen.has(sig)) open.delete(sig);
  }

  // Dissolve a lotti: in ogni lotto i gruppi hanno UTA disgiunte, così nessuna geometria è duplicata
  // (copie sovrapposte di gruppi diversi nello stesso layer rompono la topologia di mapshaper).
  const geomByUnit = new Map(unitGeoms.map((f) => [f.properties.unit_id, f.geometry]));
  const batches: { used: Set<string>; gids: number[] }[] = [];
  groups.forEach((g, gi) => {
    let b = batches.find((x) => g.units.every((u) => !x.used.has(u)));
    if (!b) {
      b = { used: new Set(), gids: [] };
      batches.push(b);
    }
    g.units.forEach((u) => b.used.add(u));
    b.gids.push(gi);
  });
  const dissolved: Feature<{ gid: number }>[] = [];
  for (const b of batches) {
    const copies = b.gids.flatMap((gi) =>
      groups[gi]!.units.map((u) => ({
        type: 'Feature',
        geometry: geomByUnit.get(u),
        properties: { gid: gi },
      })),
    );
    const out = await mapshaper.applyCommands('-i in.json -dissolve gid -o out.json precision=0.0005', {
      'in.json': { type: 'FeatureCollection', features: copies },
    });
    dissolved.push(
      ...(JSON.parse(out['out.json']!.toString()) as { features: Feature<{ gid: number }>[] }).features,
    );
  }
  const missing = dissolved.filter((f) => !f.geometry).map((f) => f.properties.gid);
  if (missing.length) throw new Error(`dissolve senza geometria per i gruppi ${missing.join(', ')}`);
  const polityName = (id: string) => d.polities.find((p) => p.id === id)?.names[0]?.name ?? id;
  return dissolved
    .sort((x, y) => x.properties.gid - y.properties.gid)
    .map((f) => {
      const g = groups[f.properties.gid]!;
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          fid: `u${f.properties.gid}`,
          layer: 'curated',
          polity_id: g.polity,
          name: polityName(g.polity),
          start_year: g.start,
          end_year: g.end,
          mode: g.mode,
          family: g.family,
          depth: g.depth,
          fill: g.fill,
          border: g.border,
          fill_state: stateColor(g.polity).fill,
          border_state: stateColor(g.polity).border,
          certainty: g.certainty,
          source: g.sources.join(','),
          units: g.units.join(','),
          ...(g.sovereign ? { sovereign_id: g.sovereign } : {}),
        },
      } satisfies Feature<PoliticalFeatureProps>;
    });
}
