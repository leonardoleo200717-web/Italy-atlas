import { describe, expect, it } from 'vitest';
import {
  formatEdtf,
  formatYear,
  historicalToAstro,
  inInterval,
  parseEdtfYear,
  parseYear,
} from '../../app/src/lib/dates.ts';

describe('anni a.C./d.C.', () => {
  it('formatta gli anni astronomici', () => {
    expect(formatYear(0)).toBe('1 a.C.');
    expect(formatYear(-499)).toBe('500 a.C.');
    expect(formatYear(1454)).toBe('1454');
    expect(formatYear(14, { era: 'always' })).toBe('14 d.C.');
  });
  it('interpreta input testuali', () => {
    expect(parseYear('500 a.C.')).toBe(-499);
    expect(parseYear('218 BC')).toBe(-217);
    expect(parseYear('1454')).toBe(1454);
    expect(parseYear('1454 d.C.')).toBe(1454);
    expect(parseYear('-499')).toBe(-499);
    expect(parseYear('boh')).toBeNull();
  });
  it('converte la numerazione storica senza anno zero', () => {
    expect(historicalToAstro(-1)).toBe(0);
    expect(historicalToAstro(-500)).toBe(-499);
    expect(historicalToAstro(1861)).toBe(1861);
    expect(() => historicalToAstro(0)).toThrow();
  });
  it('round-trip formatYear/parseYear', () => {
    for (const y of [-899, -217, 0, 1, 476, 2026]) expect(parseYear(formatYear(y))).toBe(y);
  });
});

describe('EDTF', () => {
  it('legge anno, mese, giorno e qualificatori', () => {
    expect(parseEdtfYear('1454-04-09')).toMatchObject({ start: 1454, end: 1454, approximate: false });
    expect(parseEdtfYear('1240~')).toMatchObject({ start: 1240, approximate: true });
    expect(parseEdtfYear('1030?')).toMatchObject({ uncertain: true });
    expect(parseEdtfYear('-0217')).toMatchObject({ start: -217 });
    expect(parseEdtfYear('[1100..1130]')).toMatchObject({ start: 1100, end: 1130 });
    expect(parseEdtfYear('x')).toBeNull();
  });
  it('formatta in italiano', () => {
    expect(formatEdtf('1454-04-09')).toBe('9 aprile 1454');
    expect(formatEdtf('1240~')).toBe('c. 1240');
    expect(formatEdtf('-0043-03-15')).toBe('15 marzo 44 a.C.');
  });
  it('intervalli con fine esclusiva', () => {
    expect(inInterval(1450, { start_year: 1450, end_year: 1466 })).toBe(true);
    expect(inInterval(1466, { start_year: 1450, end_year: 1466 })).toBe(false);
  });
});

describe('formatInterval', () => {
  it("mostra l'anno del cambiamento come fine", async () => {
    const { formatInterval } = await import('../../app/src/lib/dates.ts');
    expect(formatInterval(1450, 1466)).toBe('1450–1466');
    expect(formatInterval(-26, 14)).toBe('27 a.C.–14');
    expect(formatInterval(1946, 2027)).toBe('1946–oggi');
  });
});
