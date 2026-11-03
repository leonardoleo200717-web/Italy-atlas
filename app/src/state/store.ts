import { create } from 'zustand';
import type { Indexes } from '../lib/data';
import { parseHash, type Level, type Mode } from '../lib/hash';

export const MIN_YEAR = -899;
export const MAX_YEAR = new Date().getFullYear();

export interface Selection {
  fid: string;
  polity_id: string;
  layer: 'cliopatria' | 'curated';
  lngLat: [number, number];
  /** UTA cliccata (solo layer curato) */
  units?: string[];
  /** pretese, occupazioni nel punto cliccato */
  overlays: { mode: string; polity_id: string; source: string; certainty: string }[];
  props: Record<string, unknown>;
}

export type Tab = 'map' | 'eras' | 'sources';

export interface AtlasState {
  ix: Indexes | null;
  year: number;
  mode: Mode;
  level: Level;
  showClaims: boolean;
  showModern: boolean;
  showHre: boolean;
  showPlaces: boolean;
  showExternal: boolean;
  linearScale: boolean;
  playing: boolean;
  speed: number;
  selection: Selection | null;
  tab: Tab;
  flyTo: { center: [number, number]; zoom?: number; nonce: number } | null;
  setIx(ix: Indexes): void;
  setYear(y: number): void;
  /** chiede alla mappa di centrarsi su un punto */
  fly(center: [number, number], zoom?: number): void;
  set(p: Partial<Omit<AtlasState, 'setIx' | 'setYear' | 'set' | 'fly'>>): void;
}

const h = parseHash(typeof window !== 'undefined' ? window.location.hash : '');
const clampYear = (y: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(y)));

export const useAtlas = create<AtlasState>((set) => ({
  ix: null,
  year: clampYear(h.year ?? 1454),
  mode: h.mode ?? 'de_facto',
  level: h.level ?? 2,
  showClaims: h.claims ?? false,
  showModern: false,
  showHre: true,
  showPlaces: true,
  showExternal: false,
  linearScale: false,
  playing: false,
  speed: 10,
  selection: null,
  tab: 'map',
  flyTo: null,
  setIx: (ix) => set({ ix }),
  setYear: (y) => set({ year: clampYear(y) }),
  set: (p) => set(p),
  fly: (center, zoom) =>
    set((st) => ({
      flyTo: { center, ...(zoom !== undefined ? { zoom } : {}), nonce: (st.flyTo?.nonce ?? 0) + 1 },
    })),
}));

export const initialView = { center: h.center ?? ([12.5, 42.1] as [number, number]), zoom: h.zoom ?? 5.3 };
