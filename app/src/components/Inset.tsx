/** Inset «Orizzonti esterni» (RF-MAP-04): domini mediterranei delle entità italiane e di Roma. */
import { useEffect, useRef } from 'react';
import { maplibregl } from '../lib/maplibre';
import type { FilterSpecification } from 'maplibre-gl';
import { useAtlas } from '../state/store';
import { dataUrl } from '../lib/data';
import { COLORS, timeFilter } from '../lib/mapStyle';

export function Inset() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const year = useAtlas((s) => s.year);

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      interactive: false,
      attributionControl: false,
      bounds: [
        [-10, 24],
        [44, 54],
      ],
      style: {
        version: 8,
        sources: {
          land: { type: 'geojson', data: dataUrl('land-ext.geojson') },
          ext: { type: 'geojson', data: dataUrl('external.geojson') },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': COLORS.sea } },
          { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#e6e2d8' } },
          {
            id: 'ext',
            type: 'fill',
            source: 'ext',
            filter: timeFilter(year) as FilterSpecification,
            paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.9 },
          },
          {
            id: 'ext-line',
            type: 'line',
            source: 'ext',
            filter: timeFilter(year) as FilterSpecification,
            paint: { 'line-color': ['get', 'border'], 'line-width': 0.7 },
          },
          {
            id: 'coast',
            type: 'line',
            source: 'land',
            paint: { 'line-color': COLORS.coast, 'line-width': 0.4 },
          },
        ],
      },
    });
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      m.setFilter('ext', timeFilter(year) as FilterSpecification);
      m.setFilter('ext-line', timeFilter(year) as FilterSpecification);
    };
    if (m.isStyleLoaded()) apply();
    else m.once('load', apply);
  }, [year]);

  return (
    <figure className="inset">
      <div
        ref={el}
        className="inset-map"
        aria-label="Inset del Mediterraneo con i domini esterni"
        role="img"
      />
      <figcaption>
        Orizzonti esterni: Roma, Bisanzio, Venezia, Genova, Aragona/Spagna, Regno d'Italia (Cliopatria)
      </figcaption>
    </figure>
  );
}
