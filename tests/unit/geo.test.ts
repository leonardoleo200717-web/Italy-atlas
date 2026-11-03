import { describe, expect, it } from 'vitest';
import {
  clipLines,
  pointInGeometry,
  simplifyGeometry,
  simplifyRing,
  type Ring,
} from '../../pipeline/lib/geo.ts';

const square: Ring = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];
describe('geometria', () => {
  it('punto nel poligono con buco', () => {
    const hole: Ring = [
      [0.4, 0.4],
      [0.6, 0.4],
      [0.6, 0.6],
      [0.4, 0.6],
      [0.4, 0.4],
    ];
    const g = { type: 'Polygon' as const, coordinates: [square, hole] };
    expect(pointInGeometry([0.2, 0.2], g)).toBe(true);
    expect(pointInGeometry([0.5, 0.5], g)).toBe(false);
    expect(pointInGeometry([2, 2], g)).toBe(false);
  });
  it('semplificazione: mantiene la forma, toglie i punti allineati', () => {
    const r: Ring = [
      [0, 0],
      [0.5, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    expect(simplifyRing(r, 0.01)).toHaveLength(5);
  });
  it('elimina le isole troppo piccole', () => {
    expect(simplifyGeometry({ type: 'Polygon', coordinates: [square] }, 0.001, 1e9)).toBeNull();
    expect(simplifyGeometry({ type: 'Polygon', coordinates: [square] }, 0.001, 1)).not.toBeNull();
  });
  it('ritaglio linee', () => {
    const out = clipLines(
      [
        [
          [-1, 0.5],
          [0.5, 0.5],
          [2, 0.5],
        ],
      ],
      [0, 0, 1, 1],
    );
    expect(out).toEqual([]); // un solo punto interno: segmento scartato
    expect(
      clipLines(
        [
          [
            [0.1, 0.1],
            [0.2, 0.2],
            [3, 3],
          ],
        ],
        [0, 0, 1, 1],
      ),
    ).toEqual([
      [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
    ]);
  });
});
