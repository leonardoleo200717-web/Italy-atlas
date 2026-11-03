import { useMemo, useState } from 'react';
import { useAtlas } from '../state/store';
import { search, type SearchHit } from '../lib/data';
import { formatYear } from '../lib/dates';

const KIND: Record<SearchHit['kind'], string> = {
  polity: 'entità',
  person: 'persona',
  event: 'evento',
  place: 'luogo',
};

export function Search() {
  const { ix, year, set, setYear, fly } = useAtlas();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => (ix ? search(ix, q, year) : []), [ix, q, year]);
  const choose = (h: SearchHit) => {
    setYear(h.year);
    if ((h.kind === 'event' || h.kind === 'place') && h.lon !== undefined && h.lat !== undefined)
      fly([h.lon, h.lat]);
    setQ('');
    setOpen(false);
    set({ tab: 'map' });
  };
  return (
    <div className="search" role="search">
      <label>
        <span className="sr-only">Cerca</span>
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          placeholder="Cerca entità, persone, eventi, luoghi…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          aria-controls="search-results"
          aria-expanded={open && hits.length > 0}
        />
      </label>
      {open && hits.length > 0 && (
        <ul id="search-results" className="search-results" role="listbox">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`} role="option" aria-selected={false}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(h)}>
                <span className="pill">{KIND[h.kind]}</span> {h.label}{' '}
                <span className="muted">{formatYear(h.year)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
