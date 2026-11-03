/**
 * Tab «Epoche» (RF-TL-01): epoche, anni-snapshot ed eventi, sincronizzati con la mappa.
 * I percorsi guidati con testi (Panorama, ≥30 tappe) sono previsti nella fase 3 e richiedono testi con fonti.
 */
import { useAtlas } from '../state/store';
import { formatEdtf, formatYear } from '../lib/dates';
import { polityName } from '../lib/data';

export function ErasTab() {
  const { ix, year, set, setYear, fly } = useAtlas();
  if (!ix) return null;
  const go = (y: number, center?: { lon: number; lat: number }) => {
    setYear(y);
    set({ tab: 'map' });
    if (center) fly([center.lon, center.lat]);
  };
  return (
    <div className="page">
      <h2>Epoche</h2>
      <p className="muted">
        Periodizzazione convenzionale della manualistica (REQUIREMENTS §10.1). Clic su un anno o su un evento
        per portare la mappa a quella data. I percorsi guidati con testi e domande (Panorama) arriveranno
        nella fase 3.
      </p>
      <ol className="eras">
        {ix.data.eras.map((e) => {
          const evs = ix.data.events.filter((ev) => ev.year >= e.start_year && ev.year < e.end_year);
          const current = e.start_year <= year && year < e.end_year;
          return (
            <li key={e.id} className={current ? 'current' : ''}>
              <h3>
                <button type="button" className="link" onClick={() => go(e.start_year)}>
                  {e.n}. {e.name}
                </button>{' '}
                <span className="muted">
                  {formatYear(e.start_year)} –{' '}
                  {e.end_year > new Date().getFullYear() ? 'oggi' : formatYear(e.end_year - 1)}
                </span>
              </h3>
              {e.note && <p className="muted small">{e.note}</p>}
              {evs.length > 0 && (
                <ul className="events">
                  {evs.map((ev) => (
                    <li key={ev.id}>
                      <button type="button" className="link" onClick={() => go(ev.year, ev.location)}>
                        {formatEdtf(ev.date_edtf)}
                      </button>{' '}
                      — {ev.name}
                      {ev.polities.length > 0 && (
                        <span className="muted">
                          {' '}
                          (
                          {ev.polities
                            .slice(0, 3)
                            .map((p) => polityName(ix, p))
                            .join(', ')}
                          )
                        </span>
                      )}
                      {ev.certainty !== 'high' && (
                        <span className={`badge cert-${ev.certainty}`}>
                          {ev.certainty === 'low' ? 'tradizione' : 'data discussa'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
