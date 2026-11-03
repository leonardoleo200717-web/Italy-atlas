import { describe, expect, it } from 'vitest';
import { rootSovereign, sovereigntyChain, type RelationLike } from '../../app/src/lib/sovereignty.ts';

const R = (
  subject: string,
  object: string,
  type: string,
  a: number,
  b: number,
  extra: Partial<RelationLike> = {},
): RelationLike => ({
  subject,
  object,
  type,
  de_jure: true,
  de_facto: true,
  strength: 'effective',
  start_year: a,
  end_year: b,
  ...extra,
});

describe('catena di sovranità', () => {
  const rels = [
    R('contea-x', 'marchesato-y', 'vassal_of', 1000, 1200),
    R('marchesato-y', 'regno-italia', 'vassal_of', 1000, 1200),
    R('regno-italia', 'sri', 'nominal_overlordship', 1000, 1200),
    R('ducato-milano', 'sri', 'imperial_fief', 1395, 1797, { de_facto: false, strength: 'nominal' }),
    R('a', 'b', 'vassal_of', 0, 10),
    R('b', 'a', 'vassal_of', 0, 10),
  ];
  it('segue i soli tipi gerarchici', () => {
    const c = sovereigntyChain('contea-x', 1100, rels, 'de_facto');
    expect(c.map((r) => r.object)).toEqual(['marchesato-y', 'regno-italia']);
    expect(rootSovereign('contea-x', c)).toBe('regno-italia');
  });
  it('rispetta il tempo', () => {
    expect(sovereigntyChain('contea-x', 1200, rels, 'de_facto')).toHaveLength(0);
  });
  it('distingue de jure / de facto ed effective', () => {
    expect(sovereigntyChain('ducato-milano', 1454, rels, 'de_facto')).toHaveLength(0);
    expect(sovereigntyChain('ducato-milano', 1454, rels, 'de_jure')).toHaveLength(1);
    expect(sovereigntyChain('ducato-milano', 1454, rels, 'de_jure', { effectiveOnly: true })).toHaveLength(0);
  });
  it('non va in loop sui cicli', () => {
    expect(sovereigntyChain('a', 5, rels, 'de_facto')).toHaveLength(1);
  });
});
