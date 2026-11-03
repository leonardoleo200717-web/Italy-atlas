/**
 * Pannello dettaglio (RF-PANEL): nomi, tipo e governo, sovrano, capitale, catena di sovranità
 * cliccabile con tipo di relazione e flag de facto/de jure, pretese/occupazioni, eventi ±25 anni,
 * predecessori/successori, fonti, certezza e link Wikipedia/Wikidata.
 */
import { useAtlas } from '../state/store';
import { activeAt, polityName, sourceHref, type Indexes } from '../lib/data';
import { formatEdtf, formatInterval, formatYear } from '../lib/dates';
import { HIERARCHICAL, sovereigntyChain } from '../lib/sovereignty';
import { CERTAINTY_LABEL, KIND_LABEL, MODE_LABEL, RELATION_LABEL } from './labels';

function Sources({
  ix,
  list,
}: {
  ix: Indexes;
  list: { id: string; loc?: string | undefined; note?: string | undefined }[];
}) {
  return (
    <ul className="sources">
      {list.map((s, i) => {
        const src = ix.source.get(s.id);
        const href = sourceHref(ix, s);
        const label = `${src?.title ?? s.id}${s.loc ? ` — ${s.loc}` : ''}`;
        return (
          <li key={i}>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {label}
              </a>
            ) : (
              label
            )}
            {s.id === 'src-todo' && <span className="badge cert-low">fonte mancante</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function DetailPanel() {
  const { ix, selection: sel, year, mode, set, setYear } = useAtlas();
  if (!ix || !sel) return null;
  const p = ix.polity.get(sel.polity_id);
  const props = sel.props as {
    name?: string;
    certainty?: keyof typeof CERTAINTY_LABEL;
    source?: string;
    member_of?: string;
    wikipedia?: string;
    wikidata?: string;
    start_year?: number;
    end_year?: number;
  };
  const name = props.name ?? polityName(ix, sel.polity_id);
  const chain = sovereigntyChain(sel.polity_id, year, ix.data.relations, mode);
  const otherRels = ix.data.relations.filter(
    (r) =>
      (r.subject === sel.polity_id || r.object === sel.polity_id) &&
      r.start_year <= year &&
      year < r.end_year &&
      !HIERARCHICAL.has(r.type),
  );
  const reigns = activeAt(ix.data.reigns, year).filter((r) => r.polity_id === sel.polity_id);
  const events = ix.data.events
    .filter((e) => Math.abs(e.year - year) <= 25 && e.polities.includes(sel.polity_id))
    .sort((a, b) => a.year - b.year);
  const gov = p ? activeAt(p.government, year) : [];
  const caps = p ? activeAt(p.capitals, year) : [];
  const featureSources = (props.source ?? '')
    .split(',')
    .filter(Boolean)
    .map((id) => ({ id }));
  const wikidata = props.wikidata ?? p?.wikidata;
  const enwiki = props.wikipedia ?? p?.wikipedia;
  const units = sel.units?.map((u) => ix.unit.get(u)).filter(Boolean) ?? [];
  const select = (id: string) => {
    set({
      selection: {
        ...sel,
        polity_id: id,
        fid: '',
        layer: sel.layer,
        props: { name: polityName(ix, id) },
        overlays: [],
      },
    });
  };

  return (
    <aside className="panel" aria-label="Dettaglio dell'entità selezionata">
      <button
        type="button"
        className="close"
        onClick={() => set({ selection: null })}
        aria-label="Chiudi il pannello"
      >
        ×
      </button>
      <p className="eyebrow">
        {formatYear(year, { era: 'always' })} · {MODE_LABEL[mode]}
      </p>
      <h2>{name}</h2>
      {p && p.names.length > 1 && (
        <p className="muted">
          {p.names
            .slice(1)
            .map((n) => `${n.name} (${n.lang})`)
            .join(' · ')}
        </p>
      )}
      <p>
        {p && <span className="pill">{KIND_LABEL[p.kind] ?? p.kind}</span>}
        {props.certainty && (
          <span className={`badge cert-${props.certainty}`}>{CERTAINTY_LABEL[props.certainty]}</span>
        )}
        {sel.layer === 'curated' ? (
          <span className="pill">layer curato (UTA)</span>
        ) : (
          <span className="pill">Cliopatria L1</span>
        )}
      </p>
      {p && (
        <p className="muted">
          Esistenza: {formatInterval(p.start_year, p.end_year)}
          {props.start_year !== undefined &&
            props.end_year !== undefined &&
            ` · questo confine: ${formatInterval(props.start_year, props.end_year)}`}
        </p>
      )}

      {gov.length > 0 && (
        <section>
          <h3>Forma di governo</h3>
          <p>{gov.map((g) => g.type).join('; ')}</p>
        </section>
      )}

      <section>
        <h3>Sovrano / vertice</h3>
        {reigns.length ? (
          <ul>
            {reigns.map((r, i) => {
              const person = ix.person.get(r.person_id);
              return (
                <li key={i}>
                  <strong>{person?.names[0]?.name ?? r.person_id}</strong> — {r.title} (
                  {formatInterval(r.start_year, r.end_year)})
                  {r.legitimacy === 'de_facto' && <span className="badge">solo de facto</span>}
                  {r.note && <div className="muted">{r.note}</div>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">Dato non disponibile per questo anno.</p>
        )}
      </section>

      {caps.length > 0 && (
        <section>
          <h3>Capitale</h3>
          <p>
            {caps
              .map((c) => activeAt(ix.place.get(c.place_id)?.names ?? [], year)[0]?.name ?? c.place_id)
              .join(', ')}
          </p>
        </section>
      )}

      <section>
        <h3>Catena di sovranità ({MODE_LABEL[mode]})</h3>
        {chain.length ? (
          <ol className="chain">
            <li>{name}</li>
            {chain.map((r, i) => (
              <li key={i}>
                <span className="muted">{RELATION_LABEL[r.type] ?? r.type}</span>{' '}
                <button type="button" className="link" onClick={() => select(r.object)}>
                  {polityName(ix, r.object)}
                </button>{' '}
                <span className="muted">
                  ({r.de_facto ? 'de facto' : ''}
                  {r.de_facto && r.de_jure ? ' e ' : ''}
                  {r.de_jure ? 'de jure' : ''}, {r.strength === 'effective' ? 'effettiva' : 'nominale'})
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Entità sovrana{props.member_of ? '' : ' (nessuna dipendenza registrata)'}.</p>
        )}
        {props.member_of && (
          <p className="muted">
            Cliopatria la registra come parte di: {props.member_of.replace(/[()]/g, '')}.
          </p>
        )}
        {otherRels.map((r, i) => (
          <p key={i} className="muted">
            {polityName(ix, r.subject)} {RELATION_LABEL[r.type]} {polityName(ix, r.object)}
            {r.note ? ` — ${r.note}` : ''}
          </p>
        ))}
      </section>

      {sel.overlays.length > 0 && (
        <section>
          <h3>Pretese e occupazioni in questo punto</h3>
          <ul>
            {sel.overlays.map((o, i) => (
              <li key={i}>
                {o.mode === 'claim' ? 'Rivendicato da' : 'Occupato militarmente da'}{' '}
                <strong>{polityName(ix, o.polity_id)}</strong>{' '}
                <span className={`badge cert-${o.certainty}`}>
                  {CERTAINTY_LABEL[o.certainty as keyof typeof CERTAINTY_LABEL]}
                </span>
                <Sources ix={ix} list={o.source.split(',').map((id) => ({ id }))} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>Eventi (±25 anni)</h3>
        {events.length ? (
          <ul className="events">
            {events.map((e) => (
              <li key={e.id}>
                <button type="button" className="link" onClick={() => setYear(e.year)}>
                  {formatEdtf(e.date_edtf)}
                </button>{' '}
                — {e.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nessun evento registrato per questa entità in questo intervallo.</p>
        )}
      </section>

      {p && (p.predecessors.length > 0 || p.successors.length > 0) && (
        <section>
          <h3>Predecessori e successori</h3>
          <p>
            {p.predecessors.map((x) => (
              <button key={x} type="button" className="link" onClick={() => select(x)}>
                ← {polityName(ix, x)}
              </button>
            ))}{' '}
            {p.successors.map((x) => (
              <button key={x} type="button" className="link" onClick={() => select(x)}>
                {polityName(ix, x)} →
              </button>
            ))}
          </p>
        </section>
      )}

      {units.length > 0 && (
        <section>
          <h3>Unità territoriali ({units.length})</h3>
          <details>
            <summary>Elenco UTA e note di approssimazione</summary>
            <ul className="units">
              {units.map((u) => (
                <li key={u!.id}>
                  {u!.name}{' '}
                  <span className={`badge cert-${u!.certainty}`}>{CERTAINTY_LABEL[u!.certainty]}</span>
                  {u!.note && <div className="muted">{u!.note}</div>}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <section>
        <h3>Fonti</h3>
        <Sources
          ix={ix}
          list={[
            ...(p?.sources ?? []),
            ...featureSources.filter((f) => !p?.sources.some((s) => s.id === f.id)),
          ]}
        />
        {p?.note && <p className="muted">{p.note}</p>}
        <p className="links">
          {enwiki && (
            <a
              href={`https://en.wikipedia.org/wiki/${encodeURIComponent(enwiki.replace(/ /g, '_'))}`}
              target="_blank"
              rel="noreferrer"
            >
              Wikipedia (en)
            </a>
          )}
          {wikidata && (
            <>
              <a
                href={`https://www.wikidata.org/wiki/Special:GoToLinkedPage/itwiki/${wikidata}`}
                target="_blank"
                rel="noreferrer"
              >
                Wikipedia (it)
              </a>
              <a href={`https://www.wikidata.org/wiki/${wikidata}`} target="_blank" rel="noreferrer">
                Wikidata {wikidata}
              </a>
            </>
          )}
        </p>
        <p className="muted small">
          I record con revisione «draft» citano la voce di riferimento ma non sono ancora stati verificati
          puntualmente.
        </p>
      </section>
    </aside>
  );
}
