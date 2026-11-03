/** Legenda dinamica (§9.3): solo le famiglie presenti nell'anno, più i pattern attivi. */
import { useMemo, useState } from 'react';
import { useAtlas } from '../state/store';
import { FAMILIES, polityColor } from '../lib/colors';
import { visibleAt, type PoliticsFC } from '../lib/politics';
import { COLORS } from '../lib/mapStyle';
import type { Family } from '../lib/schema';

export function Legend({ politics }: { politics: PoliticsFC }) {
  const { year, mode, level, showClaims, showHre } = useAtlas();
  const [open, setOpen] = useState(true);
  const info = useMemo(() => {
    const vis = visibleAt(politics, year, mode);
    const fam = new Map<Family, number>();
    let claims = 0;
    let occ = 0;
    let low = 0;
    for (const f of vis) {
      const p = f.properties;
      if (p.mode === 'claim') claims++;
      else if (p.mode === 'occupation') occ++;
      else {
        fam.set(p.family, (fam.get(p.family) ?? 0) + 1);
        if (p.certainty === 'low') low++;
      }
    }
    const curated = vis.some((f) => f.properties.layer === 'curated');
    return { fam: [...fam.entries()].sort((a, b) => b[1] - a[1]), claims, occ, low, curated };
  }, [politics, year, mode]);
  const hreActive = showHre && year >= 922 && year <= 1802;

  return (
    <section className={`legend${open ? '' : ' closed'}`} aria-label="Legenda">
      <button type="button" className="legend-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        Legenda {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="legend-body">
          {level === 1 ? (
            <p className="muted small">Livello «Stati»: un colore per entità (non indica la sovranità).</p>
          ) : (
            <ul>
              {info.fam.map(([f]) => {
                const c = polityColor(f, 'legend');
                return (
                  <li key={f}>
                    <span className="swatch" style={{ background: c.fill, borderColor: c.border }} />
                    {FAMILIES[f].label}
                  </li>
                );
              })}
            </ul>
          )}
          <ul className="legend-patterns">
            <li>
              <span className="swatch pattern-missing" />
              Dato non disponibile
            </li>
            {info.low > 0 && (
              <li>
                <span className="swatch dashed" />
                Certezza bassa (bordo tratteggiato)
              </li>
            )}
            {info.curated && (
              <li>
                <span className="swatch pattern-uncertain" />
                Unità territoriale mista: confine approssimato
              </li>
            )}
            {showClaims && info.claims > 0 && (
              <li>
                <span className="swatch pattern-hatch" />
                Pretesa (tratteggio nel colore del pretendente)
              </li>
            )}
            {mode === 'de_facto' && info.occ > 0 && (
              <li>
                <span className="swatch pattern-dots" />
                Occupazione militare
              </li>
            )}
            {hreActive && (
              <li>
                <span className="swatch line" style={{ borderColor: COLORS.hre }} />
                Sacro Romano Impero (sovranità nominale)
              </li>
            )}
          </ul>
          <p className="muted small">Tinta più chiara = maggiore dipendenza. Bordo = sovrano diretto.</p>
        </div>
      )}
    </section>
  );
}
