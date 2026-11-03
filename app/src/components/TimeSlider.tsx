/**
 * Slider temporale (RF-TIME 01-07): scala non lineare per epoca (o lineare), bande delle epoche,
 * tacche sugli anni-snapshot ed eventi, play/pausa con velocità, ±1, evento precedente/successivo,
 * input numerico, tastiera (frecce, PgSu/PgGiù, Home/End).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_YEAR, MIN_YEAR, useAtlas } from '../state/store';
import { formatYear, parseYear } from '../lib/dates';
import { linearScale, segmentedScale } from '../lib/timescale';

const SPEEDS = [1, 5, 10, 25];
const BAND_COLORS = ['#e8e1d3', '#d9e2e6'];

export function TimeSlider() {
  const { ix, year, setYear, playing, speed, linearScale: linear, set } = useAtlas();
  const track = useRef<HTMLDivElement>(null);
  // bozza dell'input numerico: null = mostra l'anno corrente
  const [draft, setDraft] = useState<string | null>(null);
  const input = draft ?? formatYear(year);
  const [dragging, setDragging] = useState(false);

  const scale = useMemo(() => {
    if (!ix || linear) return linearScale(MIN_YEAR, MAX_YEAR);
    return segmentedScale(
      ix.data.eras.map((e) => ({ ...e, end_year: Math.min(e.end_year, MAX_YEAR) })),
      MIN_YEAR,
      MAX_YEAR,
    );
  }, [ix, linear]);

  const eventYears = useMemo(
    () =>
      ix
        ? [...new Set(ix.data.events.filter((e) => e.importance >= 4).map((e) => e.year))].sort(
            (a, b) => a - b,
          )
        : [],
    [ix],
  );

  // riproduzione: aggiornamenti a 10 Hz
  useEffect(() => {
    if (!playing) return;
    let acc = 0;
    const id = window.setInterval(() => {
      acc += speed / 10;
      const step = Math.floor(acc);
      if (step >= 1) {
        acc -= step;
        const y = useAtlas.getState().year + step;
        if (y >= MAX_YEAR) set({ playing: false });
        setYear(y);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, speed, set, setYear]);

  const yearFromClientX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return scale.toYear((clientX - r.left) / r.width);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setYear(yearFromClientX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging) setYear(yearFromClientX(e.clientX));
  };

  const jumpEvent = (dir: 1 | -1) => {
    const ys = eventYears;
    const next = dir > 0 ? ys.find((y) => y > year) : [...ys].reverse().find((y) => y < year);
    if (next !== undefined) setYear(next);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const big = e.shiftKey ? 10 : 1;
    const map: Record<string, () => void> = {
      ArrowRight: () => setYear(year + big),
      ArrowUp: () => setYear(year + big),
      ArrowLeft: () => setYear(year - big),
      ArrowDown: () => setYear(year - big),
      PageUp: () => setYear(year + 25),
      PageDown: () => setYear(year - 25),
      Home: () => setYear(MIN_YEAR),
      End: () => setYear(MAX_YEAR),
    };
    const f = map[e.key];
    if (f) {
      e.preventDefault();
      f();
    }
  };

  if (!ix) return null;
  const pct = (y: number) => `${(scale.toPos(y) * 100).toFixed(3)}%`;
  const era = ix.data.eras
    .filter((e) => e.start_year <= year && year < e.end_year)
    .sort((a, b) => b.n - a.n)[0];

  return (
    <section className="timeslider" aria-label="Linea del tempo">
      <div className="ts-controls">
        <button
          type="button"
          onClick={() => set({ playing: !playing })}
          aria-pressed={playing}
          title={playing ? 'Pausa' : 'Riproduci'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <label className="ts-speed">
          <span className="sr-only">Velocità</span>
          <select
            value={speed}
            onChange={(e) => set({ speed: Number(e.target.value) })}
            aria-label="Velocità di riproduzione"
          >
            {SPEEDS.map((v) => (
              <option key={v} value={v}>
                {v} anni/s
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => jumpEvent(-1)}
          title="Evento precedente"
          aria-label="Evento precedente"
        >
          ⏮
        </button>
        <button type="button" onClick={() => setYear(year - 1)} aria-label="Anno precedente">
          −1
        </button>
        <form
          className="ts-input"
          onSubmit={(e) => {
            e.preventDefault();
            const y = parseYear(input);
            if (y !== null) setYear(y);
            setDraft(null);
          }}
        >
          <label>
            <span className="sr-only">Anno</span>
            <input
              value={input}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setDraft(null)}
              aria-label="Anno (es. 1454 o 218 a.C.)"
              inputMode="text"
            />
          </label>
        </form>
        <button type="button" onClick={() => setYear(year + 1)} aria-label="Anno successivo">
          +1
        </button>
        <button
          type="button"
          onClick={() => jumpEvent(1)}
          title="Evento successivo"
          aria-label="Evento successivo"
        >
          ⏭
        </button>
        <span className="ts-era" aria-live="polite">
          {era ? `${era.n}. ${era.name}` : ''}
        </span>
        <label className="ts-linear">
          <input type="checkbox" checked={linear} onChange={(e) => set({ linearScale: e.target.checked })} />{' '}
          scala lineare
        </label>
      </div>

      <div className="ts-bands" aria-hidden="true">
        {ix.data.eras.map((e, i) => (
          // scorciatoia per il puntatore; l'equivalente accessibile è la tab «Epoche» e lo slider
          <div
            key={e.id}
            className={`ts-band${era?.id === e.id ? ' current' : ''}`}
            style={{
              left: pct(e.start_year),
              width: `calc(${pct(Math.min(e.end_year, MAX_YEAR))} - ${pct(e.start_year)})`,
              background: BAND_COLORS[i % 2],
              top: e.id === 'bizantini' ? '50%' : 0,
              height: e.id === 'bizantini' ? '50%' : '100%',
            }}
            title={`${e.n}. ${e.name} (${formatYear(e.start_year)} – ${formatYear(e.end_year - 1)})`}
            onClick={() => setYear(e.start_year)}
          >
            <span>{e.n}</span>
          </div>
        ))}
      </div>

      <div
        ref={track}
        className="ts-track"
        role="slider"
        tabIndex={0}
        aria-label="Anno"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={year}
        aria-valuetext={formatYear(year, { era: 'always' })}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {eventYears.map((y) => (
          <span key={`e${y}`} className="ts-tick event" style={{ left: pct(y) }} />
        ))}
        {ix.data.snapshots.map((sn) => (
          <span
            key={`s${sn.year}`}
            className={`ts-tick snapshot${sn.mvp ? ' mvp' : ''}`}
            style={{ left: pct(sn.year) }}
            title={sn.reason}
          />
        ))}
        <span className="ts-handle" style={{ left: pct(year) }} />
      </div>
      <div className="ts-snapshots">
        {ix.data.snapshots
          .filter((sn) => sn.mvp)
          .map((sn) => (
            <button
              key={sn.year}
              type="button"
              className={sn.year === year ? 'on' : ''}
              style={{ left: pct(sn.year) }}
              onClick={() => setYear(sn.year)}
              title={sn.reason}
            >
              {formatYear(sn.year)}
            </button>
          ))}
      </div>
    </section>
  );
}
