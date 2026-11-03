/** Test sui dati: validazione curata (RNF-07) e completezza degli output della pipeline. */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCurated, validate } from '../../pipeline/lib/curated.ts';
import type { PoliticalFeatureProps } from '../../app/src/lib/schema.ts';

describe('dati curati', () => {
  const { data, issues } = loadCurated();
  it('schema valido', () => expect(issues.filter((i) => i.level === 'error')).toEqual([]));
  it('nessun errore di validazione', () => {
    expect(validate(data, { strict: false }).filter((i) => i.level === 'error')).toEqual([]);
  });
  it('ogni anno-snapshot MVP è presente', () => {
    const mvp = data.snapshots.filter((s) => s.mvp).map((s) => s.year);
    expect(mvp).toEqual([-499, -217, 14, 400, 600, 800, 1000, 1200, 1454, 1559, 1815, 1861]);
  });
  it('epoche ordinate e contigue (a parte la sovrapposizione dichiarata 5/6)', () => {
    const e = [...data.eras].sort((a, b) => a.n - b.n);
    for (let i = 1; i < e.length; i++)
      if (e[i]!.id !== 'bizantini' && e[i - 1]!.id !== 'bizantini')
        expect(e[i]!.start_year).toBe(e[i - 1]!.end_year);
  });
});

describe('output della pipeline', () => {
  const p = 'public/data/politics.geojson';
  it.runIf(fs.existsSync(p))('ogni feature ha fonte, certezza e intervallo valido', () => {
    const fc = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      features: { properties: PoliticalFeatureProps }[];
    };
    for (const f of fc.features) {
      expect(f.properties.source).toBeTruthy();
      expect(['high', 'medium', 'low', 'disputed']).toContain(f.properties.certainty);
      expect(f.properties.start_year).toBeLessThan(f.properties.end_year);
      expect(f.properties.fill).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it.runIf(fs.existsSync('public/data/manifest.json'))('manifest con licenze e checksum', () => {
    const m = JSON.parse(fs.readFileSync('public/data/manifest.json', 'utf8')) as {
      outputs: { sha256: string }[];
      licenses: unknown[];
    };
    expect(m.outputs.length).toBeGreaterThan(5);
    expect(m.licenses.length).toBeGreaterThan(0);
  });
});
