/**
 * Catena di sovranità (REQUIREMENTS §3.3, §6.3 passo 4, §9.3).
 * Solo i tipi gerarchici contribuiscono a root_sovereign e profondità; unioni personali,
 * condomini, occupazioni, pretese e sovranità nominali sono mostrati a parte (overlay, pannello).
 */
export interface RelationLike {
  subject: string;
  object: string;
  type: string;
  de_jure: boolean;
  de_facto: boolean;
  strength: 'effective' | 'nominal';
  start_year: number;
  end_year: number;
  unit_ids?: string[] | undefined;
}

export const HIERARCHICAL = new Set([
  'vassal_of',
  'imperial_vicariate',
  'imperial_fief',
  'papal_fief',
  'province_of',
  'viceroyalty_of',
  'protectorate',
  'tributary',
  'client_state',
]);

export type SovMode = 'de_facto' | 'de_jure';

export interface ChainOptions {
  /** true: solo relazioni `effective` (usato per i colori). */
  effectiveOnly?: boolean;
}

/** Restituisce gli archi della catena dal soggetto verso il sovrano supremo, attivi nell'anno t. */
export function sovereigntyChain<R extends RelationLike>(
  polityId: string,
  t: number,
  relations: R[],
  mode: SovMode,
  opts: ChainOptions = {},
): R[] {
  const chain: R[] = [];
  const seen = new Set([polityId]);
  let cur = polityId;
  for (;;) {
    const next = relations.find(
      (r) =>
        r.subject === cur &&
        HIERARCHICAL.has(r.type) &&
        !r.unit_ids?.length &&
        r.start_year <= t &&
        t < r.end_year &&
        (mode === 'de_facto' ? r.de_facto : r.de_jure) &&
        (!opts.effectiveOnly || r.strength === 'effective'),
    );
    if (!next || seen.has(next.object)) break;
    chain.push(next);
    seen.add(next.object);
    cur = next.object;
  }
  return chain;
}

export function rootSovereign(polityId: string, chain: RelationLike[]): string {
  return chain.length ? chain[chain.length - 1]!.object : polityId;
}
