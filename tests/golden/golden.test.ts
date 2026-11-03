/**
 * Golden test per anno-snapshot (REQUIREMENTS §6.4, §10.2): per ogni caso, l'entità visibile nel punto
 * deve essere quella attesa. I casi con `known_issue` documentano deviazioni note delle sorgenti:
 * sono riportati come "todo" e falliscono se la deviazione scompare (così il file va aggiornato).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { whoAt } from './query.ts';

interface Case {
  place: string;
  lon: number;
  lat: number;
  expect: string;
  mode?: 'de_facto' | 'de_jure';
  note?: string;
  known_issue?: string;
  source: { id: string; loc?: string };
}
const dir = path.resolve('tests/golden');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

describe.each(files)('golden %s', (file) => {
  const g = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as { year: number; cases: Case[] };
  for (const c of g.cases) {
    const label = `${g.year} ${c.place} → ${c.expect}${c.mode === 'de_jure' ? ' (de jure)' : ''}`;
    const got = () => whoAt(g.year, c.lon, c.lat, c.mode ?? 'de_facto').map((p) => p.polity_id);
    if (c.known_issue) {
      it(`${label} [deviazione nota]`, () => {
        expect(got(), `la deviazione nota sembra risolta: aggiornare ${file}`).not.toContain(c.expect);
      });
    } else {
      it(label, () => {
        expect(c.source.id).toMatch(/^src-/);
        expect(got()).toContain(c.expect);
      });
    }
  }
});
