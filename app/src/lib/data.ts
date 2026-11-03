/** Caricamento degli output della pipeline e indici lato client. */
import type {
  Certainty,
  Era,
  EventItem,
  Family,
  Person,
  Place,
  Reign,
  Snapshot,
  Source,
  SovereigntyRelation,
} from './schema';

export interface PolityInfo {
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
  certainty: Certainty;
  sources: { id: string; loc?: string; note?: string }[];
  note?: string;
  curated: boolean;
}

export interface UnitInfo {
  id: string;
  name: string;
  certainty: Certainty;
  note?: string;
}

export interface AtlasData {
  polities: PolityInfo[];
  relations: SovereigntyRelation[];
  reigns: Reign[];
  persons: Person[];
  events: EventItem[];
  eras: Era[];
  snapshots: Snapshot[];
  places: (Place & { lon: number; lat: number })[];
  units: UnitInfo[];
  sources: Source[];
}

export interface Manifest {
  inputs: { file: string; url: string; source: string; sha256: string }[];
  outputs: { file: string; bytes: number; sha256: string }[];
  licenses: { files: string[]; content: string; license: string; source: string }[];
  sources: Source[];
  stats: Record<string, number | string>;
}

export interface Indexes {
  data: AtlasData;
  polity: Map<string, PolityInfo>;
  person: Map<string, Person>;
  place: Map<string, AtlasData['places'][number]>;
  source: Map<string, Source>;
  unit: Map<string, UnitInfo>;
}

export const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

export async function loadAtlas(): Promise<Indexes> {
  const res = await fetch(dataUrl('atlas.json'));
  if (!res.ok) throw new Error(`atlas.json: HTTP ${res.status}. Eseguire "npm run data:build".`);
  const data = (await res.json()) as AtlasData;
  return {
    data,
    polity: new Map(data.polities.map((p) => [p.id, p])),
    person: new Map(data.persons.map((p) => [p.id, p])),
    place: new Map(data.places.map((p) => [p.id, p])),
    source: new Map(data.sources.map((s) => [s.id, s])),
    unit: new Map(data.units.map((u) => [u.id, u])),
  };
}

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch(dataUrl('manifest.json'));
  return (await res.json()) as Manifest;
}

export const polityName = (ix: Indexes, id: string | undefined, lang = 'it') => {
  if (!id) return '';
  const p = ix.polity.get(id);
  return p?.names.find((n) => n.lang === lang)?.name ?? p?.names[0]?.name ?? id;
};

export const activeAt = <T extends { start_year: number; end_year: number }>(rows: T[], t: number) =>
  rows.filter((r) => r.start_year <= t && t < r.end_year);

/** Link a una fonte: le voci Wikipedia diventano URL. */
export function sourceHref(ix: Indexes, s: { id: string; loc?: string | undefined }): string | undefined {
  if (s.id === 'src-wikipedia-it' && s.loc)
    return `https://it.wikipedia.org/wiki/${encodeURIComponent(s.loc.replace(/ /g, '_'))}`;
  if (s.id === 'src-wikipedia-en' && s.loc)
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(s.loc.replace(/ /g, '_'))}`;
  return ix.source.get(s.id)?.url;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type SearchHit =
  | { kind: 'polity'; id: string; label: string; year: number }
  | { kind: 'person'; id: string; label: string; year: number; polity?: string }
  | { kind: 'event'; id: string; label: string; year: number; lon?: number; lat?: number }
  | { kind: 'place'; id: string; label: string; year: number; lon: number; lat: number };

/** Ricerca unica su entità, persone, eventi e luoghi (RF-NAV), senza dipendenze. */
export function search(ix: Indexes, q: string, currentYear: number, limit = 12): SearchHit[] {
  const n = norm(q.trim());
  if (n.length < 2) return [];
  const hits: (SearchHit & { score: number })[] = [];
  const score = (label: string) => {
    const l = norm(label);
    if (l === n) return 0;
    if (l.startsWith(n)) return 1;
    if (l.includes(` ${n}`)) return 2;
    if (l.includes(n)) return 3;
    return -1;
  };
  const clamp = (a: number, b: number) => Math.min(Math.max(currentYear, a), b - 1);
  for (const p of ix.data.polities) {
    const best = Math.min(...p.names.map((x) => score(x.name)).filter((s) => s >= 0), 99);
    if (best < 99)
      hits.push({
        kind: 'polity',
        id: p.id,
        label: p.names[0]!.name,
        year: clamp(p.start_year, p.end_year),
        score: best,
      });
  }
  for (const p of ix.data.persons) {
    const best = Math.min(...p.names.map((x) => score(x.name)).filter((s) => s >= 0), 99);
    if (best < 99) {
      const r = ix.data.reigns.find((x) => x.person_id === p.id);
      hits.push({
        kind: 'person',
        id: p.id,
        label: p.names[0]!.name,
        year: r?.start_year ?? currentYear,
        ...(r ? { polity: r.polity_id } : {}),
        score: best + 0.1,
      });
    }
  }
  for (const e of ix.data.events) {
    const s = score(e.name);
    if (s >= 0)
      hits.push({
        kind: 'event',
        id: e.id,
        label: e.name,
        year: e.year,
        ...(e.location ?? {}),
        score: s + 0.2,
      });
  }
  for (const p of ix.data.places)
    for (const nm of p.names) {
      const s = score(nm.name);
      if (s >= 0) {
        hits.push({
          kind: 'place',
          id: p.id,
          label: nm.name,
          year: clamp(nm.start_year, nm.end_year),
          lon: p.lon,
          lat: p.lat,
          score: s + 0.3,
        });
        break;
      }
    }
  return hits.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label)).slice(0, limit);
}
