/**
 * Stile MapLibre: basemap neutra (RF-MAP-02), layer politico filtrato per anno lato client
 * (`start_year <= t < end_year`, §6.1 p. 5), pattern per pretese/occupazioni/incertezza (§9.1),
 * linea viola del Sacro Romano Impero (§9.1 p. 4), etichette (§9.4).
 */
import type { ExpressionSpecification, FilterSpecification, StyleSpecification } from 'maplibre-gl';
import { dataUrl } from './data';
import type { Level, Mode } from './hash';

export const COLORS = {
  sea: '#dfe8ec',
  land: '#f4f1ea',
  coast: '#8fa6b0',
  river: '#9fb9c6',
  lake: '#cfdde3',
  modern: '#5d5d5d',
  hre: '#6a3d9a',
  label: '#2b2b2b',
  labelMinor: '#555555',
};

export const timeFilter = (t: number): ExpressionSpecification => [
  'all',
  ['<=', ['get', 'start_year'], t],
  ['>', ['get', 'end_year'], t],
];

/** Feature politiche visibili: Cliopatria sempre (sotto), curate nella modalità attiva. */
export function politicsFilter(t: number, mode: Mode, layer: 'cliopatria' | 'curated'): FilterSpecification {
  return (
    layer === 'cliopatria'
      ? ['all', ['==', ['get', 'layer'], 'cliopatria'], timeFilter(t)]
      : ['all', ['==', ['get', 'layer'], 'curated'], ['==', ['get', 'mode'], mode], timeFilter(t)]
  ) as FilterSpecification;
}

export const overlayFilter = (t: number, mode: 'claim' | 'occupation'): FilterSpecification =>
  ['all', ['==', ['get', 'mode'], mode], timeFilter(t)] as FilterSpecification;

export const labelFilter = (t: number, mode: Mode): FilterSpecification =>
  [
    'all',
    ['any', ['==', ['get', 'layer'], 'cliopatria'], ['==', ['get', 'mode'], mode]],
    timeFilter(t),
    // etichette Cliopatria nascoste dove il layer curato le copre
    [
      '!',
      [
        'all',
        ['<=', ['coalesce', ['get', 'covered_from'], 99999], t],
        ['>', ['coalesce', ['get', 'covered_to'], -99999], t],
      ],
    ],
  ] as FilterSpecification;

export const unitsUncertainFilter = (t: number): FilterSpecification =>
  [
    'all',
    ['==', ['get', 'certainty'], 'low'],
    ['<=', ['get', 'valid_from'], t],
    ['>', ['get', 'valid_to'], t],
  ] as FilterSpecification;

export const fillColor = (level: Level): ExpressionSpecification =>
  level === 1 ? ['get', 'fill_state'] : ['get', 'fill'];
export const borderColor = (level: Level): ExpressionSpecification =>
  level === 1 ? ['get', 'border_state'] : ['get', 'border'];

const lineWidth = (a: number, b: number): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  4,
  a,
  8,
  b,
];

/** Due serie di riempimenti (A/B) per il crossfade ≤ 250 ms tra stati consecutivi (RF-TIME-06). */
export const FILL_SETS = ['a', 'b'] as const;
export const FADE_MS = 200;
export const FILL_OPACITY = 1;

export function buildStyle(): StyleSpecification {
  const geo = (file: string) => ({ type: 'geojson' as const, data: dataUrl(file) });
  const fills = FILL_SETS.flatMap((s) =>
    (['cliopatria', 'curated'] as const).map((layer) => ({
      id: `pol-${layer}-${s}`,
      type: 'fill' as const,
      source: 'politics',
      filter: ['==', ['get', 'fid'], '__none__'] as FilterSpecification,
      paint: {
        'fill-color': ['get', 'fill'] as ExpressionSpecification,
        'fill-opacity': s === 'a' ? FILL_OPACITY : 0,
        'fill-opacity-transition': { duration: FADE_MS, delay: 0 },
      },
    })),
  );
  return {
    version: 8,
    glyphs: `${new URL(import.meta.env.BASE_URL, window.location.href).href}fonts/{fontstack}/{range}.pbf`,
    sources: {
      land: geo('land.geojson'),
      lakes: geo('lakes.geojson'),
      rivers: geo('rivers.geojson'),
      modern: geo('borders-modern.geojson'),
      politics: { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'fid' },
      labels: geo('labels.geojson'),
      hre: geo('hre.geojson'),
      units: geo('units.geojson'),
      places: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': COLORS.sea } },
      // terra senza dati politici: grigio a puntini = «dato non disponibile» (§9.2)
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-pattern': 'missing' } },
      ...fills.filter((l) => l.id.includes('cliopatria')),
      {
        id: 'pol-cliopatria-line',
        type: 'line',
        source: 'politics',
        filter: ['==', ['get', 'fid'], '__none__'],
        paint: { 'line-color': ['get', 'border'], 'line-width': lineWidth(0.6, 1.6), 'line-opacity': 0.9 },
      },
      ...fills.filter((l) => l.id.includes('curated')),
      {
        // UTA che approssimano male i confini storici (unità miste): tratteggio grigio (§9.1 p. 7)
        id: 'units-uncertain',
        type: 'fill',
        source: 'units',
        filter: ['==', ['get', 'unit_id'], '__none__'],
        paint: { 'fill-pattern': 'uncertain', 'fill-opacity': 0.9 },
      },
      {
        id: 'pol-curated-band',
        type: 'line',
        source: 'politics',
        filter: ['==', ['get', 'fid'], '__none__'],
        paint: {
          'line-color': ['get', 'border'],
          'line-width': lineWidth(2, 7),
          'line-opacity': 0.35,
          'line-blur': 1,
        },
      },
      {
        id: 'pol-curated-line',
        type: 'line',
        source: 'politics',
        filter: ['==', ['get', 'fid'], '__none__'],
        paint: { 'line-color': ['get', 'border'], 'line-width': lineWidth(0.8, 2) },
      },
      {
        id: 'pol-low-line',
        type: 'line',
        source: 'politics',
        filter: ['==', ['get', 'fid'], '__none__'],
        paint: { 'line-color': '#4a4a4a', 'line-width': lineWidth(0.8, 1.8), 'line-dasharray': [2, 2] },
      },
      {
        id: 'units-line',
        type: 'line',
        source: 'units',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#7a7a7a', 'line-width': 0.5, 'line-dasharray': [1, 2] },
      },
      {
        id: 'claims',
        type: 'fill',
        source: 'politics',
        layout: { visibility: 'none' },
        filter: ['==', ['get', 'fid'], '__none__'],
        paint: { 'fill-pattern': ['concat', 'hatch-', ['slice', ['get', 'border'], 1]] },
      },
      {
        id: 'occupation',
        type: 'fill',
        source: 'politics',
        filter: ['==', ['get', 'fid'], '__none__'],
        paint: { 'fill-pattern': ['concat', 'dots-', ['slice', ['get', 'border'], 1]] },
      },
      {
        id: 'lakes',
        type: 'fill',
        source: 'lakes',
        paint: { 'fill-color': COLORS.lake, 'fill-outline-color': COLORS.coast },
      },
      {
        id: 'rivers',
        type: 'line',
        source: 'rivers',
        paint: {
          'line-color': COLORS.river,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 8, 1.4],
        },
      },
      { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': COLORS.coast, 'line-width': 0.7 } },
      {
        id: 'hre',
        type: 'line',
        source: 'hre',
        filter: ['==', ['get', 'start_year'], -99999],
        paint: { 'line-color': COLORS.hre, 'line-width': lineWidth(1.5, 3.5), 'line-opacity': 0.85 },
      },
      {
        id: 'modern',
        type: 'line',
        source: 'modern',
        layout: { visibility: 'none' },
        paint: {
          'line-color': COLORS.modern,
          'line-width': 0.8,
          'line-dasharray': [3, 2],
          'line-opacity': 0.7,
        },
      },
      {
        id: 'places',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': ['case', ['get', 'capital'], 3.5, 2.2],
          'circle-color': ['case', ['get', 'capital'], '#1d1d1d', '#ffffff'],
          'circle-stroke-color': '#1d1d1d',
          'circle-stroke-width': 1,
        },
      },
      {
        id: 'places-label',
        type: 'symbol',
        source: 'places',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 13],
          'text-offset': [0, 0.7],
          'text-anchor': 'top',
          'text-optional': true,
        },
        minzoom: 5,
        paint: {
          'text-color': '#1d1d1d',
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.2,
        },
      },
      {
        id: 'labels',
        type: 'symbol',
        source: 'labels',
        filter: ['==', ['get', 'fid'], '__none__'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': [
            'case',
            ['==', ['get', 'kind'], 'people'],
            ['literal', ['Noto Sans Italic']],
            ['<=', ['get', 'depth'], 0],
            ['literal', ['Noto Sans Medium']],
            ['literal', ['Noto Sans Regular']],
          ],
          'text-transform': [
            'case',
            ['all', ['<=', ['get', 'depth'], 0], ['!=', ['get', 'kind'], 'people']],
            'uppercase',
            'none',
          ],
          'text-letter-spacing': ['case', ['<=', ['get', 'depth'], 0], 0.06, 0],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            ['case', ['<=', ['get', 'depth'], 0], 10, 9],
            8,
            ['case', ['<=', ['get', 'depth'], 0], 15, 13],
          ],
          'text-max-width': 8,
          'symbol-sort-key': ['get', 'depth'],
          'text-padding': 4,
        },
        paint: {
          'text-color': ['case', ['<=', ['get', 'depth'], 0], COLORS.label, COLORS.labelMinor],
          'text-halo-color': 'rgba(255,255,255,0.85)',
          'text-halo-width': 1.4,
        },
      },
    ],
  };
}
