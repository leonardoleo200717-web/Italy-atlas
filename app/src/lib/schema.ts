/**
 * Schema v1 dei dati curati (REQUIREMENTS §7).
 * Usato sia dalla pipeline (validazione in build) sia dall'app (tipi).
 *
 * Convenzioni:
 * - anni astronomici interi (1 a.C. = 0, 2 a.C. = -1); `end_year` ESCLUSIVO;
 * - la mappa dell'anno Y mostra la situazione DOPO i cambiamenti avvenuti in Y
 *   (stessa semantica di FromYear in Cliopatria);
 * - ogni record storico ha `certainty` e almeno una `sources[]` (RNF-07).
 */
import { z } from 'zod';

export const Certainty = z.enum(['high', 'medium', 'low', 'disputed']);
export type Certainty = z.infer<typeof Certainty>;

export const SourceRef = z.object({
  id: z.string().min(1),
  loc: z.string().optional(),
  note: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

const Sources = z.array(SourceRef).min(1, 'ogni record deve avere almeno una fonte');

/** Stato di revisione umana: i record redatti senza verifica puntuale della fonte restano "draft". */
export const Review = z.enum(['draft', 'reviewed']);

const Year = z.number().int().min(-3000).max(3000);
const Edtf = z.string().min(1);

const Interval = {
  start_year: Year,
  end_year: Year,
  start_edtf: Edtf.optional(),
  end_edtf: Edtf.optional(),
};

const Record = {
  certainty: Certainty,
  sources: Sources,
  review: Review.default('draft'),
  note: z.string().optional(),
};

export const Source = z.object({
  id: z.string().regex(/^src-[a-z0-9-]+$/),
  title: z.string(),
  url: z.string().url().optional(),
  license: z.string(),
  usage: z.string(),
  /** "data": dati redistribuiti nell'app; "reference": solo citazione/consultazione. */
  kind: z.enum(['data', 'reference', 'todo']),
  attribution: z.string().optional(),
  version: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

export const Family = z.enum([
  'roma',
  'bisanzio',
  'longobardi',
  'regno-italia-sri',
  'papato',
  'islam',
  'sicilia-napoli',
  'aragona-spagna',
  'francia',
  'austria',
  'venezia',
  'genova',
  'milano',
  'firenze',
  'savoia-italia',
  'indipendenti',
  'popoli-preromani',
  'greci',
  'cartagine',
  'goti',
  'franchi',
  'germania',
  'ottomani',
  'britannici',
  'svizzera',
  'neutro',
]);
export type Family = z.infer<typeof Family>;

export const PolityKind = z.enum([
  'state',
  'empire',
  'kingdom',
  'duchy',
  'republic',
  'commune',
  'signoria',
  'fief',
  'province',
  'colony',
  'people',
  'league',
  'composite',
  'other',
]);

export const Name = z.object({ lang: z.string(), name: z.string() });

export const Polity = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  wikidata: z
    .string()
    .regex(/^Q\d+$/)
    .optional(),
  names: z.array(Name).min(1),
  kind: PolityKind,
  family: Family,
  /** Scelta cartografica (non un'affermazione storica): schiarisce la tinta, es. secondogeniture asburgiche. */
  tint_offset: z.number().int().min(0).max(3).default(0),
  government: z.array(z.object({ type: z.string(), start_year: Year, end_year: Year })).default([]),
  capitals: z.array(z.object({ place_id: z.string(), start_year: Year, end_year: Year })).default([]),
  ...Interval,
  predecessors: z.array(z.string()).default([]),
  successors: z.array(z.string()).default([]),
  /** Collegamento ai record Cliopatria (per nome entità e, opzionalmente, finestra temporale). */
  cliopatria: z
    .array(z.object({ name: z.string(), start_year: Year.optional(), end_year: Year.optional() }))
    .default([]),
  ...Record,
});
export type Polity = z.infer<typeof Polity>;

export const TerritorialUnit = z.object({
  id: z.string().regex(/^uta-[a-z0-9-]+$/),
  name: z.string(),
  /** Geometria: unione di feature Natural Earth admin-1 identificate da adm1_code. */
  geometry_ref: z.object({
    dataset: z.literal('ne_10m_admin_1'),
    adm1_codes: z.array(z.string()).min(1),
  }),
  valid_from: Year,
  valid_to: Year,
  ...Record,
});
export type TerritorialUnit = z.infer<typeof TerritorialUnit>;

export const PossessionMode = z.enum(['de_facto', 'de_jure', 'claim']);

/** Una riga della tabella possessions; `unit_ids` raggruppa più UTA con la stessa storia (espanso in build). */
export const Possession = z.object({
  unit_ids: z.array(z.string()).min(1),
  polity_id: z.string(),
  mode: PossessionMode,
  ...Interval,
  ...Record,
});
export type Possession = z.infer<typeof Possession>;

export const RelationType = z.enum([
  'vassal_of',
  'imperial_vicariate',
  'imperial_fief',
  'papal_fief',
  'province_of',
  'viceroyalty_of',
  'personal_union',
  'protectorate',
  'tributary',
  'client_state',
  'ally_foederatus',
  'condominium',
  'military_occupation',
  'claim',
  'nominal_overlordship',
]);

export const SovereigntyRelation = z.object({
  subject: z.string(),
  object: z.string(),
  type: RelationType,
  de_jure: z.boolean(),
  de_facto: z.boolean(),
  strength: z.enum(['effective', 'nominal']),
  /** Per occupazioni militari o relazioni limitate a una parte del territorio. */
  unit_ids: z.array(z.string()).optional(),
  ...Interval,
  ...Record,
});
export type SovereigntyRelation = z.infer<typeof SovereigntyRelation>;

export const Person = z.object({
  id: z.string().regex(/^p-[a-z0-9-]+$/),
  names: z.array(Name).min(1),
  birth_edtf: Edtf.optional(),
  death_edtf: Edtf.optional(),
  wikidata: z
    .string()
    .regex(/^Q\d+$/)
    .optional(),
  ...Record,
});
export type Person = z.infer<typeof Person>;

export const Reign = z.object({
  person_id: z.string(),
  polity_id: z.string(),
  title: z.string(),
  legitimacy: z.enum(['de_jure', 'de_facto', 'both']).default('both'),
  ...Interval,
  ...Record,
});
export type Reign = z.infer<typeof Reign>;

export const EventItem = z.object({
  id: z.string().regex(/^ev-[a-z0-9-]+$/),
  name: z.string(),
  date_edtf: Edtf,
  year: Year,
  type: z.enum(['treaty', 'battle', 'war', 'revolt', 'proclamation', 'annexation', 'plebiscite', 'other']),
  polities: z.array(z.string()).default([]),
  importance: z.number().int().min(1).max(5),
  location: z.object({ lon: z.number(), lat: z.number() }).optional(),
  ...Record,
});
export type EventItem = z.infer<typeof EventItem>;

export const Era = z.object({
  id: z.string(),
  n: z.number().int(),
  name: z.string(),
  start_year: Year,
  end_year: Year,
  /** Peso relativo della banda sullo slider a scala non lineare (RF-TIME-02). */
  weight: z.number().positive(),
  ...Record,
});
export type Era = z.infer<typeof Era>;

export const Snapshot = z.object({
  year: Year,
  mvp: z.boolean(),
  reason: z.string(),
});
export type Snapshot = z.infer<typeof Snapshot>;

export const Place = z.object({
  id: z.string(),
  names: z.array(z.object({ name: z.string(), start_year: Year, end_year: Year })).min(1),
  /** Coordinate prese da Natural Earth populated places (preferito) oppure indicate a mano. */
  ne_name: z.string().optional(),
  lon: z.number().optional(),
  lat: z.number().optional(),
  ...Record,
});
export type Place = z.infer<typeof Place>;

export const CliopatriaMapEntry = z.object({
  name: z.string(),
  start_year: Year.optional(),
  end_year: Year.optional(),
  polity_id: z.string().regex(/^[a-z0-9-]+$/),
  name_it: z.string(),
  family: Family,
  kind: PolityKind,
  tint_offset: z.number().int().min(0).max(3).optional(),
  external: z.boolean().optional(),
});
export type CliopatriaMapEntry = z.infer<typeof CliopatriaMapEntry>;

/** Proprietà delle feature politiche prodotte dalla pipeline (public/data/politics.geojson). */
export interface PoliticalFeatureProps {
  fid: string;
  layer: 'cliopatria' | 'curated';
  polity_id: string;
  name: string;
  start_year: number;
  end_year: number;
  mode: 'de_facto' | 'de_jure' | 'claim' | 'occupation';
  family: Family;
  depth: number;
  fill: string;
  border: string;
  /** colori del livello L1 «Stati» */
  fill_state: string;
  border_state: string;
  certainty: Certainty;
  source: string;
  wikidata?: string;
  wikipedia?: string;
  member_of?: string;
  units?: string;
  sovereign_id?: string;
}
