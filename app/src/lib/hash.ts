/** Deep link (RF-MAP-11): `#y=1454&z=6&c=12.5,42.5&mode=defacto&lvl=2`. */
export type Mode = 'de_facto' | 'de_jure';
export type Level = 1 | 2 | 3;

export interface HashState {
  year?: number;
  zoom?: number;
  center?: [number, number];
  mode?: Mode;
  level?: Level;
  claims?: boolean;
}

export function parseHash(hash: string): HashState {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const out: HashState = {};
  const y = p.get('y');
  if (y !== null && /^-?\d{1,4}$/.test(y)) out.year = parseInt(y, 10);
  const z = p.get('z');
  if (z !== null && !Number.isNaN(parseFloat(z))) out.zoom = Math.min(12, Math.max(3, parseFloat(z)));
  const c = p.get('c')?.split(',').map(Number);
  if (c && c.length === 2 && c.every((v) => Number.isFinite(v))) out.center = [c[0]!, c[1]!];
  const m = p.get('mode');
  if (m === 'defacto') out.mode = 'de_facto';
  if (m === 'dejure') out.mode = 'de_jure';
  const l = p.get('lvl');
  if (l === '1' || l === '2' || l === '3') out.level = parseInt(l, 10) as Level;
  if (p.get('claims') === '1') out.claims = true;
  return out;
}

export function formatHash(s: Required<Omit<HashState, 'claims'>> & { claims: boolean }): string {
  const p = new URLSearchParams();
  p.set('y', String(s.year));
  p.set('z', s.zoom.toFixed(2));
  p.set('c', `${s.center[0].toFixed(3)},${s.center[1].toFixed(3)}`);
  p.set('mode', s.mode === 'de_facto' ? 'defacto' : 'dejure');
  p.set('lvl', String(s.level));
  if (s.claims) p.set('claims', '1');
  return '#' + p.toString().replace(/%2C/g, ',');
}
