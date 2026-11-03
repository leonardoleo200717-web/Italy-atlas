/** Pagina «Fonti e licenze» generata dal manifest (RF-NAV, RNF-08). */
import { useEffect, useState } from 'react';
import { loadManifest, type Manifest } from '../lib/data';

export function SourcesPage() {
  const [m, setM] = useState<Manifest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadManifest().then(setM, (e: unknown) => setErr(String(e)));
  }, []);
  if (err) return <div className="page">Manifest non disponibile: {err}</div>;
  if (!m) return <div className="page">Caricamento…</div>;
  return (
    <div className="page">
      <h2>Fonti e licenze</h2>
      <p>
        Regola d'oro del progetto: nessun dato storico inventato. Ogni confine, data, regnante ed evento ha
        una fonte e un grado di certezza; dove i dati mancano la mappa mostra «dato non disponibile» (grigio a
        puntini).
      </p>
      <h3>Come leggere la mappa</h3>
      <ul>
        <li>
          L'anno <em>Y</em> mostra la situazione <strong>dopo</strong> i cambiamenti avvenuti in <em>Y</em>{' '}
          (stessa convenzione di Cliopatria).
        </li>
        <li>
          Fino al 1815 e dopo il 1915 i confini sono quelli di <strong>Cliopatria</strong> (macro-stati da
          almeno ~5.000 km² e 50 anni, pixel sorgente di circa 40 km²): comuni, signorie e feudi minori non
          compaiono.
        </li>
        <li>
          Tra il 1815 e il 1915 un <strong>layer curato</strong> assegna la sovranità a unità territoriali
          (province moderne Natural Earth): è un'approssimazione dei confini storici, con le unità miste
          segnalate a certezza bassa.
        </li>
        <li>
          I popoli preromani sono «aree di insediamento prevalente», non stati con confini lineari. I confini
          medievali sono intrinsecamente approssimativi.
        </li>
      </ul>
      <h3>Sorgenti</h3>
      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Fonte</th>
            <th>Licenza</th>
            <th>Uso</th>
          </tr>
        </thead>
        <tbody>
          {m.sources
            .filter((s) => s.kind !== 'todo')
            .map((s) => (
              <tr key={s.id}>
                <td>
                  <code>{s.id}</code>
                </td>
                <td>
                  {s.url ? <a href={s.url}>{s.title}</a> : s.title}
                  {s.version ? ` (${s.version})` : ''}
                </td>
                <td>{s.license}</td>
                <td>{s.usage}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <h3>Licenze dei file distribuiti</h3>
      <ul>
        {m.licenses.map((l, i) => (
          <li key={i}>
            <strong>{l.license}</strong> — {l.content} ({l.files.join(', ')})
          </li>
        ))}
        <li>
          <strong>SIL OFL 1.1</strong> — glifi Noto Sans (fonts/)
        </li>
        <li>
          <strong>MIT</strong> — codice dell'applicazione
        </li>
      </ul>
      <h3>Attribuzioni</h3>
      <ul>
        {m.sources
          .filter((s) => s.attribution)
          .map((s) => (
            <li key={s.id}>{s.attribution}</li>
          ))}
      </ul>
      <h3>Riproducibilità</h3>
      <p className="muted">Sorgenti con checksum SHA-256 (data/raw/sources.lock.json) e file generati:</p>
      <table className="small">
        <tbody>
          {m.inputs.map((i) => (
            <tr key={i.file}>
              <td>{i.file}</td>
              <td>
                <code>{i.sha256.slice(0, 16)}…</code>
              </td>
            </tr>
          ))}
          {m.outputs.map((o) => (
            <tr key={o.file}>
              <td>{o.file}</td>
              <td>
                {(o.bytes / 1e6).toFixed(2)} MB · <code>{o.sha256.slice(0, 16)}…</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Stato della revisione: {String(m.stats.draft_records)}.</p>
    </div>
  );
}
