# Fonti dati e licenze

Registro aggiornato delle sorgenti effettivamente usate (REQUIREMENTS §8 e §13 p. 4-5). Le fonti
citate nei record sono definite in `data/curated/sources.json`; la pagina «Fonti e licenze» dell'app è
generata dal manifest prodotto dalla pipeline.

## Dati redistribuiti nell'app

| Id               | Sorgente                                                                                     | Versione                                                                   | Licenza (verificata)                 | Uso                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `src-cliopatria` | Cliopatria, Seshat Global History Databank (Bennett et al., _Scientific Data_ 12, 247, 2025) | v0.2.1 (`cliopatria.geojson.zip`, SHA-256 in `data/raw/sources.lock.json`) | CC BY 4.0                            | Confini L1 in tutte le epoche; inset esterno; contorno del SRI                  |
| `src-ne`         | Natural Earth 1:10m                                                                          | tag `v5.1.2` di `nvkelso/natural-earth-vector`                             | Pubblico dominio                     | Terre, laghi, fiumi, confini attuali; province come UTA; coordinate delle città |
| `src-noto`       | Noto Sans (glifi PBF di `protomaps/basemaps-assets`)                                         | `main` (file in `public/fonts`)                                            | SIL OFL 1.1 (`public/fonts/OFL.txt`) | Etichette della mappa                                                           |
| —                | Dati curati del progetto (`data/curated`)                                                    | —                                                                          | CC BY-SA 4.0                         | Possessi, relazioni, regni, persone, eventi, luoghi                             |

## Fonti solo di riferimento (nessun dato copiato)

| Id                                      | Uso                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src-wikipedia-it`, `src-wikipedia-en`  | Citazione di fatti (date, regni, eventi); la voce è in `loc` e diventa un link nel pannello |
| `src-treccani`                          | Riferimento                                                                                 |
| `src-requisiti`                         | Periodizzazione convenzionale (§10.1) e anni-snapshot                                       |
| `src-euratlas-ref`, `src-centennia-ref` | Solo consultazione: licenze commerciali/proprietarie, nulla è redistribuito                 |

## Stato della verifica

- **Licenze**: verificate per Cliopatria (README del repository: CC BY 4.0), Natural Earth (pubblico
  dominio) e Noto Sans (OFL). **Non** sono ancora usati AWMC (ODbL), Pleiades, DARE, CShapes (NC-SA),
  ISTAT, historical-basemaps (GPL-3.0 / CC BY-SA da chiarire): verificarne la licenza prima di integrarli.
- **Record curati**: tutti i record hanno `sources[]` e `certainty` (RNF-07, la build fallisce
  altrimenti), ma hanno `review: "draft"`: le voci citate sono indicate per titolo e vanno verificate
  puntualmente da una persona. `npm run data:validate` riporta il conteggio.
- **Anni di Cliopatria**: usati così come sono (`ToYear` inclusivo → `end_year = ToYear + 1`). Il
  dataset non documenta se gli anni a.C. seguono la numerazione storica o astronomica: possibile scarto di
  un anno prima dell'era volgare.

## Deviazioni note delle sorgenti

Registrate nei golden test con `known_issue` (il test fallisce se la deviazione scompare):

- **500 a.C., Roma**: il poligono Cliopatria della Repubblica (-500..-481) non copre la città e il
  «Roman Kingdom» dura fino al -481 (data convenzionale della Repubblica: 509 a.C.).
- **1200, Cagliari**: Cliopatria chiude il Giudicato di Cagliari nel 1187 e assegna l'area a Pisa; il
  giudicato durò fino al 1258.
- **1947-1954, Trieste**: Cliopatria assegna la città alla Jugoslavia; la Zona A del Territorio Libero
  era sotto governo militare alleato.
- Più in generale: risoluzione di circa 40 km² per pixel, soglia di 5.000 km² e 50 anni; coste e città
  costiere (Venezia, Napoli, Genova) possono cadere fuori dai poligoni; alcune etichette sono incoerenti
  (es. «Kingdom of Naples (Napoleonic)» usato anche per il periodo borbonico 1762-1805: corretto con una
  finestra temporale nella mappatura).

## Riproducibilità

`npm run data:fetch` scarica le sorgenti e verifica gli SHA-256; `npm run data:build` è deterministico
(stesso input → stessi file, verificato confrontando gli hash del manifest).
