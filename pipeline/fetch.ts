/**
 * `npm run data:fetch [-- --update-lock]`
 * Scarica le sorgenti in data/raw e verifica gli SHA-256 registrati in data/raw/sources.lock.json
 * (RNF-10: pipeline deterministica). Con --update-lock riscrive il lock (da usare solo dopo
 * aver verificato una nuova versione delle sorgenti).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { RAW, log, readJson, writeJson } from './lib/io.ts';

interface LockEntry {
  file: string;
  url: string;
  source: string;
  sha256: string;
}
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson';
const DEFAULTS: Omit<LockEntry, 'sha256'>[] = [
  {
    file: 'cliopatria.geojson.zip',
    url: 'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.1/cliopatria.geojson.zip',
    source: 'src-cliopatria',
  },
  ...[
    'ne_10m_land',
    'ne_10m_lakes',
    'ne_10m_rivers_lake_centerlines',
    'ne_10m_admin_0_boundary_lines_land',
    'ne_10m_admin_1_states_provinces',
    'ne_10m_populated_places_simple',
  ].map((n) => ({ file: `${n}.geojson`, url: `${NE}/${n}.geojson`, source: 'src-ne' })),
];

const LOCK = path.join(RAW, 'sources.lock.json');
const sha256 = (p: string) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const update = process.argv.includes('--update-lock');
const lock: LockEntry[] = fs.existsSync(LOCK) ? readJson<LockEntry[]>(LOCK) : [];
fs.mkdirSync(RAW, { recursive: true });
const out: LockEntry[] = [];
let bad = 0;
for (const d of DEFAULTS) {
  const dest = path.join(RAW, d.file);
  if (!fs.existsSync(dest)) {
    log(`scarico ${d.url}`);
    await download(d.url, dest);
  }
  const sum = sha256(dest);
  const known = lock.find((l) => l.file === d.file);
  if (known && known.sha256 !== sum && !update) {
    console.error(`✖ checksum diverso per ${d.file}: atteso ${known.sha256}, trovato ${sum}`);
    bad++;
  } else log(`${known && !update ? '✔' : '+'} ${d.file} ${sum.slice(0, 12)}…`);
  out.push({ ...d, sha256: update || !known ? sum : known.sha256 });
}
if (update || !lock.length) writeJson(LOCK, out, true);
process.exit(bad ? 1 : 0);
