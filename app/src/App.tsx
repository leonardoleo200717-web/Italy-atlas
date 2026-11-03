import { useEffect, useState } from 'react';
import { useAtlas } from './state/store';
import { loadAtlas } from './lib/data';
import { loadPolitics, type PoliticsFC } from './lib/politics';
import { formatYear } from './lib/dates';
import { MapView } from './components/MapView';
import { TimeSlider } from './components/TimeSlider';
import { DetailPanel } from './components/DetailPanel';
import { Legend } from './components/Legend';
import { Controls } from './components/Controls';
import { Inset } from './components/Inset';
import { Search } from './components/Search';
import { ErasTab } from './components/ErasTab';
import { SourcesPage } from './components/SourcesPage';

export function App() {
  const { ix, setIx, year, tab, set, showExternal, selection } = useAtlas();
  const [politics, setPolitics] = useState<PoliticsFC | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadAtlas(), loadPolitics()]).then(
      ([a, p]) => {
        setIx(a);
        setPolitics(p);
      },
      (e: unknown) => setError(String(e)),
    );
  }, [setIx]);

  return (
    <div className={`app${selection && tab === 'map' ? ' with-panel' : ''}`}>
      <header className="topbar">
        <h1>
          Atlante d'Italia{' '}
          <span className="year-display" aria-live="polite">
            {formatYear(year, { era: 'always' })}
          </span>
        </h1>
        <nav aria-label="Sezioni">
          {(
            [
              ['map', 'Mappa'],
              ['eras', 'Epoche'],
              ['sources', 'Fonti e licenze'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'on' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => set({ tab: id })}
            >
              {label}
            </button>
          ))}
        </nav>
        <Search />
      </header>
      <main>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {politics && ix && (
          <div className="map-area" hidden={tab !== 'map'}>
            <MapView politics={politics} />
            <Controls />
            <Legend politics={politics} />
            {showExternal && <Inset />}
            <DetailPanel />
          </div>
        )}
        {!politics && !error && <div className="loading">Caricamento dei confini…</div>}
        {tab === 'eras' && <ErasTab />}
        {tab === 'sources' && <SourcesPage />}
      </main>
      <TimeSlider />
    </div>
  );
}
