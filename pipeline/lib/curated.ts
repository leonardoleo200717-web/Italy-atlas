/**
 * Caricamento e validazione dei dati curati (REQUIREMENTS §6.3 passo 2, RNF-07).
 * Controlli: schema Zod, integrità referenziale, coerenza temporale, un solo possessore
 * de facto per UTA e anno, copertura completa delle UTA, fonti esistenti, `src-todo` in strict.
 */
import path from 'node:path';
import { z } from 'zod';
import {
  CliopatriaMapEntry,
  Era,
  EventItem,
  Person,
  Place,
  Polity,
  Possession,
  Reign,
  Snapshot,
  Source,
  SovereigntyRelation,
  TerritorialUnit,
} from '../../app/src/lib/schema.ts';
import { parseEdtfYear } from '../../app/src/lib/dates.ts';
import { CURATED, readJson } from './io.ts';

export interface Curated {
  sources: Source[];
  polities: Polity[];
  units: TerritorialUnit[];
  possessions: Possession[];
  relations: SovereigntyRelation[];
  persons: Person[];
  reigns: Reign[];
  events: EventItem[];
  eras: Era[];
  snapshots: Snapshot[];
  places: Place[];
  cliopatriaMap: CliopatriaMapEntry[];
}

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  msg: string;
}

function parseFile<T>(file: string, schema: z.ZodType<T>, issues: Issue[], data?: unknown): T[] {
  const raw = data ?? readJson(path.join(CURATED, file));
  const res = z.array(schema).safeParse(raw);
  if (!res.success) {
    for (const e of res.error.issues.slice(0, 50))
      issues.push({ level: 'error', file, msg: `${e.path.join('.')}: ${e.message}` });
    return [];
  }
  return res.data;
}

export function loadCurated(): { data: Curated; issues: Issue[] } {
  const issues: Issue[] = [];
  const mapRaw = readJson<{ entries: unknown[] }>(path.join(CURATED, 'cliopatria_map.json'));
  const data: Curated = {
    sources: parseFile('sources.json', Source, issues),
    polities: parseFile('polities.json', Polity, issues),
    units: parseFile('units.json', TerritorialUnit, issues),
    possessions: parseFile('possessions.json', Possession, issues),
    relations: parseFile('relations.json', SovereigntyRelation, issues),
    persons: parseFile('persons.json', Person, issues),
    reigns: parseFile('reigns.json', Reign, issues),
    events: parseFile('events.json', EventItem, issues),
    eras: parseFile('eras.json', Era, issues),
    snapshots: parseFile('snapshots.json', Snapshot, issues),
    places: parseFile('places.json', Place, issues),
    cliopatriaMap: parseFile('cliopatria_map.json', CliopatriaMapEntry, issues, mapRaw.entries),
  };
  return { data, issues };
}

/** Insieme degli id di polity validi: record curati + entità derivate dalla mappatura Cliopatria. */
export function polityIds(d: Curated): Set<string> {
  return new Set([...d.polities.map((p) => p.id), ...d.cliopatriaMap.map((m) => m.polity_id)]);
}

interface Rec {
  sources: { id: string }[];
  certainty: string;
}

export function validate(d: Curated, opts: { strict: boolean }): Issue[] {
  const issues: Issue[] = [];
  const err = (file: string, msg: string) => issues.push({ level: 'error', file, msg });
  const warn = (file: string, msg: string) => issues.push({ level: 'warning', file, msg });

  const sourceIds = new Set(d.sources.map((s) => s.id));
  const pids = polityIds(d);
  const unitIds = new Set(d.units.map((u) => u.id));
  const personIds = new Set(d.persons.map((p) => p.id));
  const placeIds = new Set(d.places.map((p) => p.id));

  const dup = (file: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(file, `id duplicato: ${id}`);
      seen.add(id);
    }
  };
  dup(
    'polities.json',
    d.polities.map((p) => p.id),
  );
  dup(
    'units.json',
    d.units.map((u) => u.id),
  );
  dup(
    'persons.json',
    d.persons.map((p) => p.id),
  );
  dup(
    'events.json',
    d.events.map((e) => e.id),
  );
  dup(
    'places.json',
    d.places.map((p) => p.id),
  );
  dup(
    'sources.json',
    d.sources.map((s) => s.id),
  );

  const checkRec = (file: string, label: string, r: Rec) => {
    for (const s of r.sources) {
      if (!sourceIds.has(s.id)) err(file, `${label}: fonte sconosciuta ${s.id}`);
      if (s.id === 'src-todo') (opts.strict ? err : warn)(file, `${label}: fonte mancante (src-todo)`);
    }
  };
  const checkInterval = (file: string, label: string, r: { start_year: number; end_year: number }) => {
    if (!(r.start_year < r.end_year))
      err(file, `${label}: start_year (${r.start_year}) deve essere < end_year (${r.end_year})`);
  };

  const all: [string, (Rec & { start_year?: number; end_year?: number })[], (r: never) => string][] = [
    ['polities.json', d.polities, (r: Polity) => r.id],
    ['units.json', d.units, (r: TerritorialUnit) => r.id],
    ['possessions.json', d.possessions, (r: Possession) => `${r.polity_id}@${r.unit_ids[0]}…`],
    ['relations.json', d.relations, (r: SovereigntyRelation) => `${r.subject}→${r.object}`],
    ['persons.json', d.persons, (r: Person) => r.id],
    ['reigns.json', d.reigns, (r: Reign) => `${r.person_id}@${r.polity_id}`],
    ['events.json', d.events, (r: EventItem) => r.id],
    ['eras.json', d.eras, (r: Era) => r.id],
    ['places.json', d.places, (r: Place) => r.id],
  ] as never;
  for (const [file, recs, label] of all)
    for (const r of recs) {
      checkRec(file, label(r as never), r);
      if (typeof r.start_year === 'number' && typeof r.end_year === 'number')
        checkInterval(file, label(r as never), r as { start_year: number; end_year: number });
    }

  for (const p of d.polities) {
    for (const x of [...p.predecessors, ...p.successors])
      if (!pids.has(x)) warn('polities.json', `${p.id}: predecessore/successore non definito: ${x}`);
    for (const c of p.capitals)
      if (!placeIds.has(c.place_id)) err('polities.json', `${p.id}: capitale sconosciuta ${c.place_id}`);
    const m = d.cliopatriaMap.find((e) => e.polity_id === p.id);
    if (m && m.family !== p.family)
      warn('polities.json', `${p.id}: famiglia diversa dalla mappatura Cliopatria (${m.family})`);
  }
  for (const u of d.units) if (u.valid_from >= u.valid_to) err('units.json', `${u.id}: validità vuota`);

  for (const ps of d.possessions) {
    if (!pids.has(ps.polity_id)) err('possessions.json', `polity sconosciuta: ${ps.polity_id}`);
    for (const uid of ps.unit_ids) {
      const u = d.units.find((x) => x.id === uid);
      if (!u) {
        err('possessions.json', `UTA sconosciuta: ${uid}`);
        continue;
      }
      if (ps.start_year < u.valid_from || ps.end_year > u.valid_to)
        err('possessions.json', `${ps.polity_id}@${uid}: intervallo fuori dalla validità della UTA`);
    }
    const pol = d.polities.find((p) => p.id === ps.polity_id);
    if (pol && (ps.start_year < pol.start_year || ps.end_year > pol.end_year))
      err(
        'possessions.json',
        `${ps.polity_id}@${ps.unit_ids[0]}: possesso fuori dalla vita dell'entità (${pol.start_year}–${pol.end_year})`,
      );
  }

  // Un solo possessore de facto per UTA e anno, e nessuna UTA scoperta (§6.3, §6.4).
  for (const u of d.units) {
    const rows = d.possessions.filter((p) => p.mode === 'de_facto' && p.unit_ids.includes(u.id));
    for (let t = u.valid_from; t < u.valid_to; t++) {
      const owners = rows.filter((r) => r.start_year <= t && t < r.end_year);
      if (owners.length === 0) {
        err('possessions.json', `${u.id}: nessun possessore de facto nel ${t}`);
        break;
      }
      if (owners.length > 1) {
        err(
          'possessions.json',
          `${u.id}: più possessori de facto nel ${t} (${owners.map((o) => o.polity_id).join(', ')})`,
        );
        break;
      }
    }
    const dj = d.possessions.filter((p) => p.mode === 'de_jure' && p.unit_ids.includes(u.id));
    for (let t = u.valid_from; t < u.valid_to; t++)
      if (dj.filter((r) => r.start_year <= t && t < r.end_year).length > 1) {
        err('possessions.json', `${u.id}: più titolari de jure nel ${t}`);
        break;
      }
  }

  for (const r of d.relations) {
    if (!pids.has(r.subject)) err('relations.json', `soggetto sconosciuto: ${r.subject}`);
    if (!pids.has(r.object)) err('relations.json', `oggetto sconosciuto: ${r.object}`);
    for (const uid of r.unit_ids ?? [])
      if (!unitIds.has(uid)) err('relations.json', `UTA sconosciuta: ${uid}`);
  }

  for (const r of d.reigns) {
    if (!personIds.has(r.person_id)) err('reigns.json', `persona sconosciuta: ${r.person_id}`);
    if (!pids.has(r.polity_id)) err('reigns.json', `polity sconosciuta: ${r.polity_id}`);
    const p = d.persons.find((x) => x.id === r.person_id);
    const birth = p?.birth_edtf ? parseEdtfYear(p.birth_edtf) : null;
    const death = p?.death_edtf ? parseEdtfYear(p.death_edtf) : null;
    if (birth && r.start_year < birth.start) err('reigns.json', `${r.person_id}: regno prima della nascita`);
    if (death && r.end_year > death.end + 1)
      err('reigns.json', `${r.person_id}@${r.polity_id}: regno oltre la morte (${death.end})`);
  }
  for (const p of d.persons)
    for (const k of ['birth_edtf', 'death_edtf'] as const) {
      const v = p[k];
      if (v && !parseEdtfYear(v)) err('persons.json', `${p.id}: EDTF non valido in ${k}: ${v}`);
    }

  for (const e of d.events) {
    for (const p of e.polities) if (!pids.has(p)) err('events.json', `${e.id}: polity sconosciuta ${p}`);
    const y = parseEdtfYear(e.date_edtf);
    if (!y) err('events.json', `${e.id}: EDTF non valido ${e.date_edtf}`);
    else if (y.start !== e.year)
      err('events.json', `${e.id}: year (${e.year}) incoerente con date_edtf (${e.date_edtf})`);
  }

  for (const pl of d.places) {
    if (!pl.ne_name && (pl.lon === undefined || pl.lat === undefined))
      err('places.json', `${pl.id}: servono ne_name oppure lon/lat`);
  }

  // mappatura Cliopatria: stessa polity con famiglie diverse è un errore cartografico
  const famByPolity = new Map<string, string>();
  for (const m of d.cliopatriaMap) {
    const f = famByPolity.get(m.polity_id);
    if (f && f !== m.family)
      err('cliopatria_map.json', `${m.polity_id}: famiglie diverse (${f}, ${m.family})`);
    famByPolity.set(m.polity_id, m.family);
  }

  const drafts = [d.polities, d.possessions, d.relations, d.reigns, d.events, d.persons]
    .flat()
    .filter((r) => r.review === 'draft').length;
  if (drafts) warn('*', `${drafts} record con review "draft": le fonti citate vanno verificate puntualmente`);
  return issues;
}

export function printIssues(issues: Issue[]): void {
  for (const i of issues) console.log(`${i.level === 'error' ? '✖' : '⚠'} [${i.file}] ${i.msg}`);
}
