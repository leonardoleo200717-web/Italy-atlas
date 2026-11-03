import { describe, expect, it } from 'vitest';
import { linearScale, segmentedScale } from '../../app/src/lib/timescale.ts';

describe('scala temporale', () => {
  it('lineare', () => {
    const s = linearScale(-899, 2026);
    expect(s.toPos(-899)).toBe(0);
    expect(s.toPos(2026)).toBe(1);
    expect(s.toYear(0.5)).toBe(Math.round((-899 + 2026) / 2));
  });
  it('a segmenti: monotona, invertibile, pesi rispettati', () => {
    const segs = [
      { start_year: -899, end_year: 0, weight: 1 },
      { start_year: 0, end_year: 1800, weight: 1 },
      { start_year: 1800, end_year: 2026, weight: 2 },
    ];
    const s = segmentedScale(segs, -899, 2026);
    expect(s.toPos(0)).toBeCloseTo(0.25, 5);
    expect(s.toPos(1800)).toBeCloseTo(0.5, 5);
    let prev = -1;
    for (let y = -899; y <= 2026; y += 7) {
      const p = s.toPos(y);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
      expect(Math.abs(s.toYear(p) - y)).toBeLessThanOrEqual(1);
    }
  });
  it('gestisce epoche sovrapposte', () => {
    const s = segmentedScale(
      [
        { start_year: 476, end_year: 553, weight: 1 },
        { start_year: 535, end_year: 568, weight: 1 },
      ],
      476,
      568,
    );
    expect(s.toPos(476)).toBe(0);
    expect(s.toPos(568)).toBeCloseTo(1, 5);
    expect(s.toPos(540)).toBeGreaterThan(s.toPos(530));
  });
});
