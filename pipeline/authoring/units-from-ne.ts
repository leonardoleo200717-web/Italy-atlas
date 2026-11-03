/**
 * Script di authoring (una tantum): genera data/curated/units.json dalle province Natural Earth.
 * Le UTA sono le province italiane moderne più alcune aree di confine; sono un'APPROSSIMAZIONE
 * dei confini storici (certainty "medium"); le note segnalano le UTA che andrebbero suddivise.
 * Uso: tsx pipeline/authoring/units-from-ne.ts data/raw/ne_10m_admin_1_states_provinces.geojson
 */
import fs from 'node:fs';

const src = process.argv[2] ?? 'data/raw/ne_10m_admin_1_states_provinces.geojson';
const ne = JSON.parse(fs.readFileSync(src, 'utf8')) as {
  features: { properties: { adm0_a3: string; adm1_code: string; name: string } }[];
};

const FIX: Record<string, string> = {
  Aoste: 'Aosta',
  Turin: 'Torino',
  Bozen: 'Bolzano',
  Oristrano: 'Oristano',
  Crotene: 'Crotone',
  'Barletta-Andria Trani': 'Barletta-Andria-Trani',
};
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const NOTES: Record<string, string> = {
  pavia:
    'UTA da suddividere: Lomellina e Oltrepò erano sabaudi dal 1743 (Worms), il Pavese a nord del Ticino lombardo-austriaco.',
  lucca: 'UTA da suddividere: la Garfagnana apparteneva al Ducato di Modena.',
  'massa-carrara': 'UTA da suddividere: la Lunigiana era frammentata tra Toscana, Modena e Parma.',
  latina:
    'UTA da suddividere: Fondi, Formia e Gaeta erano nel Regno di Napoli/Due Sicilie (Terra di Lavoro).',
  frosinone:
    'UTA da suddividere: Sora e Cassino erano nel Regno di Napoli/Due Sicilie; Pontecorvo enclave pontificia.',
  benevento:
    'La città di Benevento era enclave pontificia (fino al 1860) entro le Due Sicilie: non rappresentata a questa grana.',
  rieti:
    'Il circondario di Rieti apparteneva allo Stato della Chiesa (delegazione); confini moderni approssimati.',
  piacenza: "UTA da suddividere: l'area di Bobbio era sabauda dal 1743.",
  'reggio-emilia': 'Guastalla fu parmense fino al 1847, poi modenese.',
};

type Unit = Record<string, unknown>;
const units: Unit[] = [];
const ita = ne.features.filter((f) => f.properties.adm0_a3 === 'ITA');
for (const f of ita.sort((a, b) => a.properties.adm1_code.localeCompare(b.properties.adm1_code))) {
  const name = FIX[f.properties.name] ?? f.properties.name;
  const id = slug(name);
  units.push({
    id: `uta-${id}`,
    name: `Provincia di ${name} (confini moderni)`,
    geometry_ref: { dataset: 'ne_10m_admin_1', adm1_codes: [f.properties.adm1_code] },
    valid_from: 1815,
    valid_to: 1915,
    certainty: NOTES[id] ? 'low' : 'medium',
    sources: [{ id: 'src-ne', loc: `admin-1 ${f.properties.adm1_code}` }],
    review: 'draft',
    note: NOTES[id] ?? 'Confini provinciali moderni usati come approssimazione dei confini storici.',
  });
}
const codes = (a3: string, filter?: (n: string) => boolean) =>
  ne.features
    .filter((f) => f.properties.adm0_a3 === a3 && (!filter || filter(f.properties.name)))
    .map((f) => f.properties.adm1_code);
const extra: [string, string, string[], string][] = [
  ['uta-san-marino', 'San Marino', codes('SMR'), 'Confini attuali di San Marino.'],
  ['uta-vaticano', 'Vaticano', codes('VAT'), 'Confini attuali della Città del Vaticano (1929).'],
  [
    'uta-nizza',
    'Nizza (dipartimento Alpi Marittime)',
    codes('FRA', (n) => n === 'Alpes-Maritimes'),
    "UTA da suddividere: il dipartimento include l'arrondissement di Grasse, francese anche prima del 1860; Mentone e Roccabruna erano monegasche fino al 1848.",
  ],
  [
    'uta-savoia',
    'Savoia (dip. Savoia e Alta Savoia)',
    codes('FRA', (n) => n === 'Savoie' || n === 'Haute-Savoie'),
    'Dipartimenti francesi moderni come approssimazione del Ducato di Savoia.',
  ],
  [
    'uta-corsica',
    'Corsica',
    codes('FRA', (n) => n === 'Haute-Corse' || n === 'Corse-du-Sud'),
    'Isola intera.',
  ],
  ['uta-ticino', 'Ticino', codes('CHE', (n) => n === 'Ticino'), 'Cantone moderno.'],
  [
    'uta-istria',
    'Istria (contea istriana moderna)',
    codes('HRV', (n) => n === 'Istarska'),
    'Solo la parte croata moderna; la costa slovena (Capodistria, Pirano) non è inclusa.',
  ],
  ['uta-malta', 'Malta', codes('MLT'), 'Arcipelago intero.'],
];
for (const [id, name, adm1, note] of extra) {
  if (!adm1.length) throw new Error(`nessun codice per ${id}`);
  units.push({
    id,
    name,
    geometry_ref: { dataset: 'ne_10m_admin_1', adm1_codes: adm1 },
    valid_from: 1815,
    valid_to: 1915,
    certainty: 'medium',
    sources: [{ id: 'src-ne' }],
    review: 'draft',
    note,
  });
}
fs.writeFileSync('data/curated/units.json', JSON.stringify(units, null, 1) + '\n');
console.log(`UTA scritte: ${units.length}`);
