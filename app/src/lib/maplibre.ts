/**
 * MapLibre GL JS 6 carica il worker da un file separato: con il bundling di Vite va indicato
 * esplicitamente l'URL dell'asset copiato in build.
 */
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(workerUrl);

export { maplibregl };
