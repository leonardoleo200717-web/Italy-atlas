import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CURATED = path.join(ROOT, 'data', 'curated');
export const RAW = path.join(ROOT, 'data', 'raw');
export const OUT = path.join(ROOT, 'public', 'data');

export const readJson = <T = unknown>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

/** Scrive JSON in modo deterministico (chiavi nell'ordine di inserimento, newline finale). */
export function writeJson(p: string, data: unknown, pretty = false): number {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const s = (pretty ? JSON.stringify(data, null, 1) : JSON.stringify(data)) + '\n';
  fs.writeFileSync(p, s);
  return s.length;
}

export const log = (...a: unknown[]) => console.log('[atlas]', ...a);
