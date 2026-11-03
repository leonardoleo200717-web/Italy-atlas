import { useEffect, useRef, useState } from 'react';
import { maplibregl } from '../lib/maplibre';
import type { FilterSpecification, MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initialView, useAtlas, type Selection } from '../state/store';
import { activeAt, polityName, type Indexes } from '../lib/data';
import { formatHash } from '../lib/hash';
import {
  FADE_MS,
  FILL_OPACITY,
  FILL_SETS,
  borderColor,
  buildStyle,
  fillColor,
  labelFilter,
  overlayFilter,
  politicsFilter,
  timeFilter,
  unitsUncertainFilter,
} from '../lib/mapStyle';
import { patternFor } from '../lib/patterns';
import type { PoliticalFeatureProps } from '../lib/schema';
import { pointInPolygonGeometry, type PoliticsFC } from '../lib/politics';
import { CERTAINTY_LABEL } from './labels';

interface Hover {
  x: number;
  y: number;
  p: PoliticalFeatureProps;
}

const NONE: FilterSpecification = ['==', ['get', 'fid'], '__none__'];

export function MapView({ politics }: { politics: PoliticsFC }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const active = useRef<(typeof FILL_SETS)[number]>('a');
  const fadeTimer = useRef<number | undefined>(undefined);
  const [hover, setHover] = useState<Hover | null>(null);
  const s = useAtlas();

  // ---------------------------------------------------------------- creazione
  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: buildStyle(),
      center: initialView.center,
      zoom: initialView.zoom,
      minZoom: 4,
      maxZoom: 11,
      // finestra dei dati politici principali (pipeline: MAIN_WINDOW)
      maxBounds: [
        [-1, 34],
        [26, 49],
      ],
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Confini: Cliopatria (CC BY 4.0) e dati curati · Basemap: Natural Earth',
      }),
    );
    // pattern generati su richiesta (MapLibre 6: resolver sincrono delle immagini mancanti)
    map.setMissingStyleImageResolver((id) => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const img = patternFor(id, ratio);
      if (img && !map.hasImage(id)) map.addImage(id, img, { pixelRatio: ratio });
    });
    map.on('load', () => {
      (map.getSource('politics') as maplibregl.GeoJSONSource).setData(politics as never);
      setReady(true);
    });
    mapRef.current = map;
    (window as unknown as { __atlasMap: maplibregl.Map }).__atlasMap = map;
    return () => map.remove();
  }, [politics]);

  // ---------------------------------------------------------------- filtri per anno/modalità
  const { year, mode, level, showClaims, showHre, showModern, showPlaces, ix } = s;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const next = active.current === 'a' ? 'b' : 'a';
    const prev = active.current;
    for (const layer of ['cliopatria', 'curated'] as const) {
      map.setFilter(`pol-${layer}-${next}`, politicsFilter(year, mode, layer));
      map.setPaintProperty(`pol-${layer}-${next}`, 'fill-opacity', FILL_OPACITY);
      map.setPaintProperty(`pol-${layer}-${prev}`, 'fill-opacity', 0);
    }
    active.current = next;
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      for (const layer of ['cliopatria', 'curated'] as const) map.setFilter(`pol-${layer}-${prev}`, NONE);
    }, FADE_MS + 50);

    const curated = politicsFilter(year, mode, 'curated');
    map.setFilter('pol-cliopatria-line', politicsFilter(year, mode, 'cliopatria'));
    map.setFilter('pol-curated-line', curated);
    map.setFilter('pol-curated-band', curated);
    const lowFilter: FilterSpecification = [
      'all',
      ['==', ['get', 'certainty'], 'low'],
      ['any', ['==', ['get', 'layer'], 'cliopatria'], ['==', ['get', 'mode'], mode]],
      timeFilter(year),
    ] as FilterSpecification;
    map.setFilter('units-uncertain', unitsUncertainFilter(year));
    map.setFilter('pol-low-line', lowFilter);
    map.setFilter('claims', overlayFilter(year, 'claim'));
    map.setFilter('occupation', mode === 'de_facto' ? overlayFilter(year, 'occupation') : NONE);
    map.setFilter('labels', [
      'all',
      labelFilter(year, mode),
      ['<=', ['get', 'depth'], level === 3 ? 9 : 1],
    ] as FilterSpecification);
    map.setFilter('hre', showHre ? (timeFilter(year) as FilterSpecification) : NONE);
  }, [year, mode, level, showHre, ready]);

  // ---------------------------------------------------------------- livello e toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const set of FILL_SETS)
      for (const layer of ['cliopatria', 'curated'] as const)
        map.setPaintProperty(`pol-${layer}-${set}`, 'fill-color', fillColor(level));
    for (const id of ['pol-cliopatria-line', 'pol-curated-line', 'pol-curated-band'])
      map.setPaintProperty(id, 'line-color', borderColor(level));
    map.setLayoutProperty('units-line', 'visibility', level === 3 ? 'visible' : 'none');
    map.setLayoutProperty('claims', 'visibility', showClaims ? 'visible' : 'none');
    map.setLayoutProperty('modern', 'visibility', showModern ? 'visible' : 'none');
    for (const id of ['places', 'places-label'])
      map.setLayoutProperty(id, 'visibility', showPlaces ? 'visible' : 'none');
  }, [level, showClaims, showModern, showPlaces, ready]);

  // ---------------------------------------------------------------- luoghi dell'anno
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !ix) return;
    (map.getSource('places') as maplibregl.GeoJSONSource).setData(placesFor(ix, year) as never);
  }, [year, ix, ready]);

  // ---------------------------------------------------------------- volo richiesto
  const flyTo = s.flyTo;
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({
      center: flyTo.center,
      zoom: flyTo.zoom ?? Math.max(mapRef.current.getZoom(), 6),
      speed: 1.4,
    });
  }, [flyTo]);

  // ---------------------------------------------------------------- deep link
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const write = () => {
      const c = map.getCenter();
      const st = useAtlas.getState();
      const hash = formatHash({
        year: st.year,
        zoom: map.getZoom(),
        center: [c.lng, c.lat],
        mode: st.mode,
        level: st.level,
        claims: st.showClaims,
      });
      if (hash !== window.location.hash) history.replaceState(null, '', hash);
    };
    write();
    map.on('moveend', write);
    return () => {
      map.off('moveend', write);
    };
  }, [year, mode, level, showClaims, ready]);

  // ---------------------------------------------------------------- hover e click
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fillLayers = () => [`pol-curated-${active.current}`, `pol-cliopatria-${active.current}`];
    const pick = (pt: maplibregl.PointLike): MapGeoJSONFeature | undefined => {
      const fs = map.queryRenderedFeatures(pt, { layers: fillLayers() });
      return fs.find((f) => f.properties.layer === 'curated') ?? fs[0];
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      const f = pick(e.point);
      map.getCanvas().style.cursor = f ? 'pointer' : '';
      setHover(f ? { x: e.point.x, y: e.point.y, p: f.properties as PoliticalFeatureProps } : null);
    };
    const onLeave = () => setHover(null);
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const f = pick(e.point);
      const st = useAtlas.getState();
      if (!f) {
        st.set({ selection: null });
        return;
      }
      const p = f.properties as PoliticalFeatureProps;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const overlays = politics.features
        .filter(
          (o) =>
            (o.properties.mode === 'claim' || o.properties.mode === 'occupation') &&
            o.properties.start_year <= st.year &&
            st.year < o.properties.end_year &&
            pointInPolygonGeometry(lngLat, o.geometry),
        )
        .map((o) => ({
          mode: o.properties.mode,
          polity_id: o.properties.polity_id,
          source: o.properties.source,
          certainty: o.properties.certainty,
        }));
      const sel: Selection = {
        fid: p.fid,
        polity_id: p.polity_id,
        layer: p.layer,
        lngLat,
        overlays,
        props: p as unknown as Record<string, unknown>,
        ...(p.units ? { units: p.units.split(',') } : {}),
      };
      st.set({ selection: sel });
    };
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('click', onClick);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      map.off('click', onClick);
    };
  }, [ready, politics]);

  // evidenzia la selezione
  const sel = s.selection;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!map.getLayer('selection'))
      map.addLayer(
        {
          id: 'selection',
          type: 'line',
          source: 'politics',
          filter: NONE,
          paint: { 'line-color': '#111111', 'line-width': 3 },
        },
        'lakes',
      );
    map.setFilter(
      'selection',
      sel ? (['==', ['get', 'polity_id'], sel.polity_id] as FilterSpecification) : NONE,
    );
    if (sel) {
      map.setFilter('selection', [
        'all',
        ['==', ['get', 'polity_id'], sel.polity_id],
        ['==', ['get', 'layer'], sel.layer],
        sel.layer === 'curated' ? ['==', ['get', 'mode'], mode] : ['==', 1, 1],
        timeFilter(year),
      ] as FilterSpecification);
    }
  }, [sel, year, mode, ready]);

  return (
    <div className="map-wrap">
      <div
        ref={el}
        className="map"
        role="application"
        aria-label={`Mappa politica dell'Italia nell'anno ${year}`}
      />
      {hover && ix && (
        <div className="tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }} role="status">
          <strong>{hover.p.name}</strong>
          {hover.p.sovereign_id && <div>sotto {polityName(ix, hover.p.sovereign_id)}</div>}
          {hover.p.member_of && (
            <div className="muted">parte di {hover.p.member_of.replace(/[()]/g, '')}</div>
          )}
          <div className={`badge cert-${hover.p.certainty}`}>{CERTAINTY_LABEL[hover.p.certainty]}</div>
        </div>
      )}
    </div>
  );
}

function placesFor(ix: Indexes, t: number) {
  const capitals = new Set(
    ix.data.polities.flatMap((p) =>
      p.start_year <= t && t < p.end_year ? activeAt(p.capitals, t).map((c) => c.place_id) : [],
    ),
  );
  return {
    type: 'FeatureCollection',
    features: ix.data.places.flatMap((p) => {
      const n = activeAt(p.names, t)[0];
      if (!n) return [];
      return [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { id: p.id, name: n.name, capital: capitals.has(p.id) },
        },
      ];
    }),
  };
}
