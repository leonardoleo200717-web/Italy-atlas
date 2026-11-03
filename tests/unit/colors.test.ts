import { describe, expect, it } from 'vitest';
import {
  FAMILIES,
  contrastRatio,
  hexToOklch,
  oklchToHex,
  polityColor,
  siblingOffset,
} from '../../app/src/lib/colors.ts';
import type { Family } from '../../app/src/lib/schema.ts';

describe('colori', () => {
  it('conversione OKLCH round-trip', () => {
    for (const hex of ['#882255', '#44aa99', '#dddddd', '#1f4e9e'])
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
  });
  it('contrasto WCAG noto', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
  it('bordo ≥ 3:1 sul riempimento per ogni famiglia e profondità (SC 1.4.11)', () => {
    for (const fam of Object.keys(FAMILIES) as Family[])
      for (let depth = 0; depth <= 3; depth++)
        for (const id of ['a', 'stato-x', 'ducato-y']) {
          const c = polityColor(fam, id, depth);
          expect(contrastRatio(c.border, c.fill), `${fam} depth ${depth}`).toBeGreaterThanOrEqual(3);
        }
  });
  it('la tinta schiarisce con la profondità', () => {
    const l = [0, 1, 2].map((d) => hexToOklch(polityColor('austria', 'x', d).fill).l);
    expect(l[1]).toBeGreaterThan(l[0]!);
    expect(l[2]).toBeGreaterThan(l[1]!);
  });
  it('offset dei fratelli entro ±8°', () => {
    for (const id of ['a', 'b', 'c', 'ducato-di-modena'])
      expect(Math.abs(siblingOffset(id))).toBeLessThanOrEqual(8);
  });
  it('deterministico', () => {
    expect(polityColor('venezia', 'repubblica-di-venezia')).toEqual(
      polityColor('venezia', 'repubblica-di-venezia'),
    );
  });
});

describe('colori L1 «Stati»', () => {
  it('bordo ≥ 3:1 e deterministico', async () => {
    const { stateColor } = await import('../../app/src/lib/colors.ts');
    for (const id of ['regno-d-italia', 'stato-della-chiesa', 'x', 'y', 'clio-foo']) {
      const c = stateColor(id);
      expect(contrastRatio(c.border, c.fill)).toBeGreaterThanOrEqual(3);
      expect(stateColor(id)).toEqual(c);
    }
  });
});
