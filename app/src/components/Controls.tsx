/** Controlli dei layer: livello di dettaglio (RF-MAP-05), modalità di sovranità (RF-MAP-06), toggle. */
import { useAtlas } from '../state/store';
import type { Level, Mode } from '../lib/hash';

export function Controls() {
  const s = useAtlas();
  const radio = <T extends string | number>(
    name: string,
    value: T,
    current: T,
    label: string,
    onChange: (v: T) => void,
  ) => (
    <label className="radio">
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} />
      {label}
    </label>
  );
  return (
    <section className="controls" aria-label="Livelli della mappa">
      <fieldset>
        <legend>Dettaglio</legend>
        {radio<Level>('lvl', 1, s.level, 'L1 Stati', (v) => s.set({ level: v }))}
        {radio<Level>('lvl', 2, s.level, 'L2 Sovranità', (v) => s.set({ level: v }))}
        {radio<Level>('lvl', 3, s.level, 'L3 Dettaglio (UTA)', (v) => s.set({ level: v }))}
      </fieldset>
      <fieldset>
        <legend>Sovranità</legend>
        {radio<Mode>('mode', 'de_facto', s.mode, 'de facto', (v) => s.set({ mode: v }))}
        {radio<Mode>('mode', 'de_jure', s.mode, 'de jure', (v) => s.set({ mode: v }))}
        <label className="check">
          <input
            type="checkbox"
            checked={s.showClaims}
            onChange={(e) => s.set({ showClaims: e.target.checked })}
          />{' '}
          mostra pretese
        </label>
      </fieldset>
      <fieldset>
        <legend>Sovrapposizioni</legend>
        <label className="check">
          <input type="checkbox" checked={s.showHre} onChange={(e) => s.set({ showHre: e.target.checked })} />{' '}
          linea del Sacro Romano Impero
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.showPlaces}
            onChange={(e) => s.set({ showPlaces: e.target.checked })}
          />{' '}
          città e capitali
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.showModern}
            onChange={(e) => s.set({ showModern: e.target.checked })}
          />{' '}
          confini attuali
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.showExternal}
            onChange={(e) => s.set({ showExternal: e.target.checked })}
          />{' '}
          orizzonti esterni (inset)
        </label>
      </fieldset>
    </section>
  );
}
