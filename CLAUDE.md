# Atlante storico interattivo d'Italia: ricerca sulle risorse e file requirements per Claude Code

Nessun dataset aperto copre da solo l'Italia dal 900 a.C. a oggi al livello di comuni e signorie. La strada più solida è un'app MapLibre GL + PMTiles su hosting statico, con un **layer italiano curato da te** costruito su "unità territoriali atomiche" a cui si assegna nel tempo chi esercitava la sovranità; Cliopatria, historical-basemaps, AWMC/Pleiades/DARE, CShapes e ISTAT servono da base e riferimento, ciascuno con la sua licenza.

## TL;DR
- **Dati:** antichità ben coperta da fonti aperte (AWMC in ODbL, Pleiades in CC BY 3.0, tiles DARE in CC BY 4.0); dal 1861 copertura eccellente (ISTAT: confini comunali ai censimenti 1861-1981; CShapes 2.0: 1886-2019). Per medioevo ed età moderna esistono solo dataset globali a bassa risoluzione: Cliopatria (CC BY 4.0), salvo rare eccezioni come Vaticano e Singapore, include solo entità da almeno 5.000 km² e 50 anni (Bennett et al., *Scientific Data* 2025); historical-basemaps è GPL-3.0 e "work in progress". Le fonti precise (Euratlas, Centennia, GeaCron) sono a pagamento o proprietarie: il layer di comuni e signorie va costruito da te, usandole solo come riferimento.
- **Stack:** Vite + React + TypeScript, MapLibre GL JS, PMTiles su hosting statico. Geometrie a intervalli di validità (inizio/fine), non interpolate; attributi temporali sul modello OpenHistoricalMap (start_date/end_date, EDTF per date incerte) filtrati lato client. Colori: una famiglia cromatica per polo di sovranità, tinta più chiara al crescere della dipendenza, bordo nel colore del sovrano (convenzione Euratlas), tratteggio per le aree contese.
- **Piano:** MVP con 12 anni-snapshot e due livelli di dettaglio (stati, sovranità); poi medioevo comunale a grana fine, timeline guidate, personaggi e architettura, infine modalità studio con export Anki. Il file requirements completo è più sotto e dichiara dove i dati sono incerti o mancanti.

---

## Key Findings

### 1. Le risorse dati a confronto

| Risorsa | Copertura temporale | Dettaglio sull'Italia | Licenza | Formato | Uso in app personale | Limiti principali |
|---|---|---|---|---|---|---|
| **historical-basemaps** (aourednik) | Snapshot globali ad anni irregolari, dalla preistoria al 2010 | Basso: stati principali | GPL-3.0 sul repo\[1\]\[2\] (un progetto terzo la riporta come CC BY-SA 4.0: verificare)\[3\] | GeoJSON per anno | Sì, con copyleft | L'autore: "verify the maps by comparison to other sources before using in academic work"\[1\] |
| **Cliopatria** (Seshat) | 3400 a.C. – 2024 | Medio-basso: oltre 1.600 entità; circa 14.000 record secondo il README, circa 15.000 secondo *Scientific Data* (2025) | CC BY 4.0 | Un GeoJSON | Sì: miglior base di partenza | Pixel sorgente di circa 40 km²; soglia 5.000 km² e 50 anni, salvo rare eccezioni; "composite" (es. "(Roman Empire)") con MemberOf/Components; ID Wikidata dalla v0.2.0 (ultima release v0.2.1, da fissare in pipeline) |
| **OpenHistoricalMap** | Qualsiasi data | Variabile, crowdsourced | CC0 | Vector tiles, planet, Overpass | Sì | Copertura disomogenea; contese come relazioni `boundary=disputed` separate per pretendente, collegate da `type=chronology`\[4\]\[5\]\[6\] |
| **Euratlas** (Nüssli) | Il primo giorno di ogni anno centenario, 1-2000 d.C. | Alto, con vassalli | Commerciale, "internal use": 120-160 € a mappa (semplice), 480-640 € (estesa) | Shapefile\[7\]\[8\]\[9\]\[10\] | Solo uso interno | Uno snapshot per secolo; da usare come **riferimento** |
| **Centennia** | 1000 d.C. – oggi | Alto, passi di 0,1 anno | Proprietaria; Nations Edition (1789-1939) gratuita | App desktop | Consultazione | Mostra il potere de facto ("power on the ground")\[11\]\[12\] |
| **GeaCron** | Dal 3000 a.C. | Medio-alto | Proprietaria (database in vendita a 450.000 €)\[13\]\[14\] | Web/app | Consultazione | Chiuso\[15\]\[16\] |
| **CShapes 2.0** (ETH) | 1886-2019 | Stati e colonie | CC BY-NC-SA 4.0 | GeoJSON, Shapefile, CSV\[17\]\[18\] | Sì, non commerciale | Nessuna suddivisione interna |
| **ISTAT – confini storici** | Censimenti 1861-1981, più 1923, 1925, 1927 | Eccellente: comuni, province, circondari | Open data ISTAT (verificare) | Shapefile WGS84 UTM32N\[19\]\[20\] | Sì | Solo entro i confini nazionali; fini statistici |
| **ISTAT SITUAS / Sistat** | Dal 17/03/1861 | Variazioni di comuni e nomi\[21\]\[22\] | Open data | Web/CSV | Sì | Tabellare |
| **AWMC geodata** | Estensioni romane 60 a.C., 14, 69, 117, 200 d.C.; province 200 d.C. | Buono per Roma | ODbL (prima CC BY-NC 4.0) | GeoJSON, Shapefile | Sì, share-alike | Deriva dal Barrington Atlas; snapshot sparsi\[23\]\[24\]\[25\]\[26\] |
| **Pleiades** | Antichità | Luoghi, non confini | CC BY 3.0 | CSV, JSON, KML, RDF | Sì | 41.480 luoghi (v4.1, 28 maggio 2025) |
| **DARE** (Åhlfeldt) | Impero romano | Basemap con luoghi e strade | Tiles CC BY 4.0 | Raster XYZ zoom 4-11; versione vettoriale\[27\]\[28\] | Sì | Un solo "momento" |
| **Barrington Atlas** | Mondo greco-romano | Riferimento cartaceo | Copyright | Cartaceo | No (via Pleiades/AWMC) | — |
| **Wikidata** | Tutte | Stati, regnanti, edifici | CC0 | SPARQL | Sì | P571/P576 e P35 (con P580 richiesto) spesso incompleti per stati medievali minori\[29\]\[30\] |
| **David Rumsey** | 1500-oggi | Carte georeferenziate | Immagini CC BY-NC-SA 3.0 | Raster | Sì, overlay | Nessun confine vettoriale\[31\]\[32\] |
| **Old Maps Online** | Varie | Catalogo | Varia | Link | Ricerca | Directory di oltre 500.000 carte (dato attuale della piattaforma) |

**Che cosa significa.** Le fonti aperte danno un ottimo **scheletro** per l'antichità e per il periodo dal 1861, uno più debole per il 1000-1800, e nessuna arriva alla grana dei secoli VIII-XVIII (comuni, signorie, feudi imperiali, enclave pontificie). La cartografia di qualità per quei secoli è proprietaria. Serve quindi una pipeline di **digitalizzazione propria** con fonte citata per ogni confine; Euratlas e Centennia restano riferimento visivo, la redistribuzione resta su fonti aperte o lavoro proprio.

### 2. App esistenti: che cosa imparare

- **Chronas** (open source, Leaflet + slider, dati da Wikipedia/Wikidata, curatela wiki): collegare le entità a QID Wikidata dà contenuti gratis, ma la qualità è disomogenea ("there is still a lot of data to be fixed").\[33\]\[34\]
- **Running Reality** (3000 a.C. – oggi, granularità giornaliera): modella l'incertezza in modo nativo, mentre "a traditional GIS file format like GeoJSON does not": l'incertezza va nel modello dati, non in GeoJSON.\[35\]
- **Centennia**: potere de facto e testo narrativo sincronizzato alla mappa, da copiare per il pannello "che cosa sta succedendo".\[11\]\[36\]
- **Euratlas Periodis**: "owner mode" (vassalli assorbiti nel sovrano) e "Show Dependencies"; vassalli col proprio colore e linea punteggiata nel colore del dominante; Sacro Romano Impero come linea viola sovrapposta. È il modello per le gerarchie.\[7\]\[37\]
- **OpenHistoricalMap**: slider basato sul plugin `maplibre-gl-dates` (CC0) che filtra per `start_date`/`end_date`; dimostra che il filtro temporale lato client su vector tiles funziona.\[5\]\[38\]\[39\]\[40\]
- **chronoatlas** (open source, fase iniziale): separa "control, recognition, and claims", cioè de facto / de jure / pretesa.\[41\]
- **Historic Borders** (historicborders.app): oggi "currently unavailable", rischio tipico dei progetti personali, mitigabile con hosting statico.\[1\]

### 3. Raccomandazione motivata

1. **Copertura geografica:** vista principale fissa su penisola, isole, Corsica, Istria e Dalmazia costiera, Nizza/Savoia, Ticino. Impero romano, Stato da Mar, domini genovesi e colonie vanno in un **layer secondario** con **inset** automatico. Un rettangolo fisso stabilizza la memoria visiva; lo zoom continentale renderebbe illeggibile la frammentazione italiana.
2. **Geometrie:** mosaico di unità territoriali atomiche (UTA), micro-regioni stabili che dal 1861 coincidono con aggregati di comuni ISTAT, con record di sovranità datati. I confini di un anno si ottengono **dissolvendo** le UTA per entità: topologia senza buchi, modifiche su tabelle invece che su poligoni, slider valido per qualsiasi anno.
3. **Niente interpolazione geometrica:** i confini cambiano per eventi discreti e il morphing inventerebbe stati mai esistiti; meglio intervalli di validità più un breve crossfade.
4. **Stack:** Vite + React + TypeScript, MapLibre GL JS, PMTiles, Zustand, pipeline Python/Node con mapshaper e tippecanoe, deploy statico.\[42\]\[43\]

---

## Il file requirements completo (copia-incolla per Claude Code)

````markdown
# REQUIREMENTS — "Atlante d'Italia": mappa interattiva della storia d'Italia (900 a.C. – oggi)

> Versione 1.0 per Claude Code. Lingua: italiano.
> Regola d'oro: **nessun dato storico va inventato**. Ogni confine, data, regnante ed evento ha `sources[]` e `certainty`. Dove i dati mancano, l'app lo dice ("dato non disponibile / confine approssimato").

## 1. Visione e obiettivi
**Visione.** Un atlante interattivo che permetta a un adulto non specialista (un ingegnere) di diventare competente nella storia d'Italia: confini, frammentazione, dipendenze feudali, dinastie, personaggi e architettura dai popoli preromani alla Repubblica.

**Obiettivi misurabili**
- O1. Per ogni anno tra −900 e l'anno corrente, mappa politica in < 300 ms dal rilascio dello slider (dati in cache).
- O2. Click su un'area: entità, forma di governo, sovrano, catena di sovranità, capitale, eventi dell'anno, con fonte.
- O3. Percorso guidato di almeno 30 tappe su tutte le epoche della sezione 10.
- O4. Incertezza visibile: confini approssimati, date incerte, sovranità contesa o multipla.
- O5. (Opzionale) Quiz e flashcard esportabili in Anki.

**Non-obiettivi v1**: editing collaborativo, account, backend con database, copertura mondiale.

## 2. Utenti e casi d'uso
Persona: "ingegnere curioso", desktop prioritario, poi tablet.
- UC1 Esplorazione: slider 1300→1500, i comuni si consolidano in signorie e stati regionali.
- UC2 Interrogazione: 1454, click su Milano → Ducato di Milano, Francesco Sforza, feudo imperiale (SRI), Pace di Lodi.
- UC3 Percorso: "Dal Regno longobardo all'Impero carolingio (568-888)", con la mappa che salta ad anno e area di ogni tappa.
- UC4 Personaggi: "Federico II" → ruoli datati (re di Sicilia, imperatore, re di Gerusalemme), luoghi, opere (Castel del Monte).
- UC5 Architettura: layer attivo nel 1150 → edifici romanici e arabo-normanni esistenti.
- UC6 Confronto: swipe tra due anni (1494 contro 1559).
- UC7 Studio: quiz di 5 domande dopo una tappa ed export in Anki.

## 3. Requisiti funzionali

### 3.1 Mappa (RF-MAP)
- 01: Vista principale con bbox indicativa lon 5.5–19.5, lat 35.5–47.5 (Corsica, Nizza/Savoia, Ticino, Istria, Dalmazia costiera, Malta).
- 02: Basemap fisica neutra (rilievo, idrografia, coste) senza confini moderni; toggle "confini attuali" come linea grigia sottile.
- 03: Layer politico per l'anno selezionato (sezione 9), etichette con nomi d'epoca.
- 04: Layer "Orizzonti esterni", spento di default: estensione romana, Stato da Mar, domini genovesi, colonie (Eritrea, Somalia, Libia, Dodecaneso, Albania, Tientsin). Quando attivo compare un **inset** mediterraneo o mondiale.
- 05: Livelli di dettaglio: L1 "Stati" (sovrani e grandi vassalli), L2 "Sovranità" (famiglie di colore), L3 "Dettaglio" (comuni, signorie, feudi minori dove disponibili).
- 06: Modalità di sovranità: **de facto** (default), **de jure**, **mostra pretese** (tratteggio).
- 07: Hover → tooltip (nome, sovrano, certezza); click → pannello (3.3).
- 08: Marker per capitali e città principali col nome d'epoca (Pleiades per l'antichità, Wikidata poi).
- 09: Overlay facoltativo di carta storica georeferenziata (es. David Rumsey, CC BY-NC-SA) con slider di opacità.
- 10: Incertezza: bordo sfumato o tratteggiato se `certainty` è "low"; badge "approssimato".
- 11: Deep link, es. `/#y=1454&z=6&c=12.5,42.5&mode=defacto`.

### 3.2 Slider temporale (RF-TIME)
- 01: Range −900 → anno corrente; internamente anni astronomici (1 a.C. = 0), in UI "a.C./d.C.".
- 02: Scala non lineare a segmenti per epoca (più densa dove i cambi sono frequenti); scala lineare opzionale.
- 03: Tacche sugli anni-snapshot ed evento (10.2) con tooltip del motivo.
- 04: Play/pausa, velocità (1, 5, 10, 25 anni/s), ±1 anno, evento precedente/successivo, input numerico.
- 05: Bande colorate delle epoche sopra lo slider.
- 06: Crossfade ≤ 250 ms tra stati consecutivi; **nessuna** interpolazione geometrica.
- 07: Tastiera: frecce, PgSu/PgGiù, Home/End.

### 3.3 Pannello dettaglio (RF-PANEL)
Per l'anno selezionato:
- nome ufficiale e varianti (latino, volgare, moderno);
- tipo e forma di governo (comune podestarile, signoria, ducato, repubblica oligarchica, regno, monarchia costituzionale…);
- sovrano o reggente (titolo, dinastia, date); per le repubbliche, la magistratura di vertice (doge, podestà, gonfaloniere) se nota;
- capitale;
- **catena di sovranità** cliccabile (es. *Contea X → Marchesato Y → Regnum Italiae → SRI*) con tipo di relazione e flag de facto/de jure;
- pretendenti con fonti in caso di contesa;
- eventi ±25 anni, personaggi attivi, opere esistenti;
- predecessori e successori;
- fonti, certezza, link a Wikipedia (it) e Wikidata.

### 3.4 Tab "Timeline guidata" (RF-TL)
- 01: Epoche (10.1), sotto-periodi ed eventi.
- 02: Percorsi di tappe = {anno, vista, layer, testo di 150-300 parole, domande chiave, personaggi, edifici}, con avanti/indietro e barra di avanzamento.
- 03: "Panorama" (circa 30 tappe) più percorsi tematici: repubbliche marinare, Mezzogiorno dai Normanni ai Borbone, Papato come potenza territoriale, Risorgimento, Italia coloniale.
- 04: Sincronizzazione bidirezionale tra timeline e mappa.
- 05: Avanzamento salvato in localStorage.

### 3.5 Personaggi (RF-PERS)
Scheda con nome, varianti, nascita e morte (EDTF), **ruoli con intervalli**, entità, luoghi, eventi, opere commissionate, ritratto Commons con licenza, QID. Ricerca e filtri per epoca e ruolo; layer marker; diagramma dinastico per entità.

### 3.6 Architettura (RF-ARCH)
Scheda opera: nome, tipo, stile (vocabolario controllato), fasi di costruzione, committente e architetto, coordinate, stato attuale, UNESCO sì/no, immagine, QID. Il layer mostra solo le opere **esistenti** nell'anno; galleria di 5-10 edifici emblematici per epoca.

### 3.7 Modalità studio (RF-STUDY, fase 5)
Quiz da dati strutturati ("Chi regnava a Napoli nel 1450?", "Clicca sul Ducato di Urbino nel 1500", "Ordina questi eventi"); ripetizione dilazionata locale (SM-2 semplificato); export Anki in `.apkg` (es. genanki in build) o CSV/TSV con tag `epoca::…`; flashcard con screenshot della mappa.

### 3.8 Navigazione (RF-NAV)
Ricerca unica su entità, persone, eventi, opere e luoghi; legenda dinamica collassabile; pagina "Fonti e licenze" generata dal manifest.

## 4. Requisiti non funzionali
- RNF-01: primo caricamento < 3 s su 4G; cambio anno < 300 ms; 60 fps nel pan/zoom su laptop medio.
- RNF-02: bundle JS < 500 KB gzip (escluso MapLibre); dati politici della vista principale < 15 MB in PMTiles con range request.
- RNF-03: hosting **statico** (GitHub/Cloudflare Pages, Netlify); file PMTiles < 100 MB su GitHub Pages.\[44\]
- RNF-04: PWA offline (fase 5).
- RNF-05: WCAG 2.2 AA: testo ≥ 4.5:1; oggetti grafici ≥ 3:1 (SC 1.4.11);\[45\] colore mai unico veicolo d'informazione (SC 1.4.1), quindi pattern ed etichette; tastiera completa; screen reader; modalità daltonici.
- RNF-06: i18n predisposta; i nomi storici sono dati, non stringhe UI.
- RNF-07: la build **fallisce** se un record non ha `sources` o `certainty`.
- RNF-08: manifest delle licenze e attribuzioni visibili; share-alike rispettato (ODbL AWMC, CC BY-NC-SA CShapes e Rumsey, GPL historical-basemaps).
- RNF-09: TypeScript strict, JSON Schema + Zod, ESLint/Prettier, CI.
- RNF-10: pipeline deterministica da sorgenti con checksum.

## 5. Stack consigliato
| Area | Scelta | Motivo | Alternative |
|---|---|---|---|
| UI/build | Vite + React + TypeScript | Ecosistema maturo, ben supportato da Claude Code | SvelteKit |
| Mappa | **MapLibre GL JS** v5.x | Vector tiles, espressioni data-driven, `fill-pattern`, plugin `maplibre-gl-dates` | OpenLayers (proiezioni, raster storici); Leaflet (meno adatto a stili dinamici); deck.gl solo come overlay |
| Tiles | **PMTiles** (file unico, range request) via tippecanoe | Nessun server\[43\]\[46\] | GeoJSON/TopoJSON diretto nell'MVP (< ~5 MB per snapshot) |
| Basemap | Natural Earth (dominio pubblico); tiles DARE opzionali per l'età romana | Neutra | Protomaps filtrata |
| Stato | Zustand | Semplice | Redux Toolkit |
| Ricerca | MiniSearch (indice generato in build) | Client-side | Fuse.js |
| Timeline | Componente SVG/D3 custom | Scala non lineare | vis-timeline |
| Geoprocessing | mapshaper, GDAL, QGIS, geopandas/shapely o turf | Standard | — |
| Test | Vitest, Playwright, axe-core, data test | — | Cypress |
| Contenuti | Markdown/MDX per le tappe; YAML/JSON per i dati | Modificabili a mano | — |

**Snapshot e interpolazione:** il modello è a **intervalli di validità** (`start`/`end`); lo stato all'anno *t* è il sottoinsieme valido in *t*. Gli anni-snapshot servono da controllo qualità e da tacche, non come unico dato.

## 6. Architettura tecnica e pipeline dati

### 6.1 Unità Territoriali Atomiche (UTA)
1. Mosaico senza buchi né sovrapposizioni; ogni UTA è la porzione più piccola che ha cambiato sovranità come blocco (contado, valle, isola, enclave come Benevento e Pontecorvo).
2. Dal 1861 le UTA derivano da comuni ISTAT aggregati; per l'antichità da regioni ed etnie (AWMC, Pleiades); per medioevo ed età moderna da digitalizzazione manuale in QGIS su carte georeferenziate, con Euratlas e Centennia **solo in consultazione**.
3. UTA versionate (`valid_from`/`valid_to`) quando vanno suddivise.
4. Tabella `possessions`: UTA → entità per intervallo e modalità (de facto / de jure / claim).
5. In build, per ogni anno di cambiamento: dissolve per entità con attributi `start_year`, `end_year`, `polity_id`, `root_sovereign_id`, `depth`, `certainty`, in un PMTiles filtrato lato client con `["all", ["<=", "start_year", t], [">", "end_year", t]]`.
6. Layer esterno separato: AWMC per Roma, Cliopatria per i domini mediterranei, CShapes per le colonie dal 1886.

### 6.2 Repository
```
/app/src/{components,state,lib}   # Map, TimeSlider, DetailPanel, TimelineTab, PersonCard, ArchCard, Legend, Quiz
/data/raw        # sorgenti o script di download con checksum
/data/curated    # polities, possessions, relations, reigns, persons, events, works, paths, sources
/data/geo        # UTA (GeoPackage), layer esterni
/pipeline        # validate, topology, resolve, dissolve, simplify, tile, index, manifest
/public/data     # *.pmtiles, indici JSON, manifest.json
/tests           # unit, e2e, golden
```

### 6.3 Pipeline (`npm run data:build`)
1. `fetch` con checksum.
2. `validate`: schema, integrità referenziale, coerenza temporale (`start < end`; regno entro la vita della persona; un solo possessore de facto per UTA e anno, salvo `contested`).
3. `topology`: nessun buco o sovrapposizione; geometrie valide.
4. `resolve`: catena di sovranità, `root_sovereign`, `depth`.
5. `dissolve` → `simplify` (mapshaper, topologia preservata, 2-3 livelli di zoom) → `tile` (tippecanoe: `politics`, `external`, `places`).
6. `index` (ricerca, eventi per anno) e `manifest`.

### 6.4 Testing
- Golden test per anno-snapshot (entità attese revisionate a mano); nessuna UTA senza possessore (salvo `terra_incognita` esplicita); ogni record con fonte.
- Unit: date (a.C./d.C., EDTF), catena di sovranità, colori.
- E2E: slider; casi noti (Napoli 1450 → Alfonso V d'Aragona; Firenze 1469 → Lorenzo de' Medici signore de facto in una repubblica de jure); deep link; percorso completo.
- Visual regression su 10 anni-chiave; axe-core e test di contrasto della palette.

## 7. Modello dati

### 7.1 Convenzioni
- ID kebab-case stabili, più `wikidata` (QID) se esiste.
- `start_year`/`end_year` interi astronomici (`end` esclusivo), più `start_edtf`/`end_edtf` opzionali (es. `"1030~"`, `"[1100..1130]"`), come `start_date:edtf` di OpenHistoricalMap.\[4\]\[38\]
- `certainty`: `high` | `medium` | `low` | `disputed`. `sources[]`: `{id, loc, note}` → `sources.json`.

### 7.2 Entità
Polity (stato, comune, signoria, feudo, provincia, popolo con `kind: "people"`), TerritorialUnit, Possession, SovereigntyRelation, Reign, Person, Event, Work, Style, Era, Path/Step, Source.

### 7.3 Tipi di relazione di sovranità
`vassal_of` · `imperial_vicariate` · `imperial_fief` · `papal_fief` (es. Regno di Sicilia/Napoli verso il Papato) · `province_of` · `viceroyalty_of` (Napoli, Sicilia, Sardegna sotto la Spagna) · `personal_union` · `protectorate` · `tributary` · `client_state` (repubbliche sorelle 1797-99) · `ally_foederatus` (socii italici) · `condominium` · `military_occupation` · `claim` · `nominal_overlordship` (es. Regno Italico/SRI sui comuni dopo il 1183).
Ogni relazione ha `de_facto`, `de_jure` e `strength` (`effective` | `nominal`). Le entità sovranazionali seguono il modello "composite" di Cliopatria (MemberOf/Components).\[47\]

### 7.4 Schema JSON di esempio
```json
{
  "polity": {
    "id": "ducato-di-milano", "wikidata": "Q_VERIFICARE",
    "names": [{ "lang": "it", "name": "Ducato di Milano" }, { "lang": "la", "name": "Ducatus Mediolani" }],
    "kind": "state",
    "government": [
      { "type": "ducato-signorile", "start_year": 1395, "end_year": 1535 },
      { "type": "dominio-asburgico", "start_year": 1535, "end_year": 1797 }
    ],
    "capitals": [{ "place_id": "milano", "start_year": 1395, "end_year": 1797 }],
    "start_year": 1395, "end_year": 1797,
    "predecessors": ["signoria-viscontea"], "successors": ["repubblica-cisalpina"],
    "certainty": "high", "sources": [{ "id": "src-treccani", "loc": "voce 'Milano, Ducato di'" }]
  },
  "possession": {
    "unit_id": "uta-lomb-pavia", "polity_id": "ducato-di-milano", "mode": "de_facto",
    "start_year": 1395, "end_year": 1797, "start_edtf": "1395-09-05",
    "certainty": "high", "sources": [{ "id": "src-euratlas-ref", "loc": "1400/1500, solo consultazione" }]
  },
  "sovereignty_relation": {
    "subject": "ducato-di-milano", "object": "sacro-romano-impero", "type": "imperial_fief",
    "de_jure": true, "de_facto": false, "strength": "nominal",
    "start_year": 1395, "end_year": 1797,
    "note": "Investitura di Venceslao (1395) a Gian Galeazzo Visconti; dal 1535 controllo effettivo asburgico-spagnolo (relazione distinta).",
    "certainty": "high", "sources": [{ "id": "src-treccani" }]
  },
  "reign": {
    "person_id": "p-francesco-sforza", "polity_id": "ducato-di-milano", "title": "Duca di Milano",
    "start_year": 1450, "end_year": 1466, "legitimacy": "de_facto",
    "note": "Acclamato nel 1450; investitura imperiale mai ottenuta.",
    "certainty": "high", "sources": [{ "id": "src-dbi", "loc": "DBI, 'Sforza, Francesco'" }]
  },
  "event": {
    "id": "ev-pace-di-lodi", "name": "Pace di Lodi", "date_edtf": "1454-04-09", "type": "treaty",
    "polities": ["ducato-di-milano", "repubblica-di-venezia"], "importance": 5,
    "sources": [{ "id": "src-treccani" }]
  },
  "work": {
    "id": "w-castel-del-monte", "name": "Castel del Monte", "type": "castello", "style": "gotico-federiciano",
    "built": { "start_edtf": "1240~", "end_edtf": "1250~" }, "patron": "p-federico-ii-hohenstaufen",
    "location": { "lon": 16.27, "lat": 41.08 }, "unesco": true,
    "certainty": "medium", "sources": [{ "id": "src-unesco" }]
  },
  "contested": {
    "unit_id": "uta-corsica", "polity_id": "corona-d-aragona", "mode": "claim",
    "start_year": 1297, "end_year": 1453,
    "note": "Infeudazione papale (1297) agli Aragonesi; controllo effettivo prevalentemente genovese.",
    "certainty": "medium", "sources": [{ "id": "src-treccani" }]
  }
}
```
> QID e coordinate vanno **verificati via SPARQL** in pipeline; i valori dell'esempio sono illustrativi.

### 7.5 Wikidata come arricchimento
SPARQL su stati storici (`P31` Q3024240, `P571`, `P576`), capi di Stato (`P35`, qualificatore `P580` richiesto) e cariche (`P39` con `P580`/`P582`).\[29\]\[48\]\[49\] I risultati vanno in `data/candidates/` e si revisionano a mano.

## 8. Fonti dati e licenze
| ID | Fonte | URL | Licenza | Uso |
|---|---|---|---|---|
| src-cliopatria | Cliopatria (Seshat), *Scientific Data* 12, 247 (2025) | https://github.com/Seshat-Global-History-Databank/cliopatria | CC BY 4.0\[50\] | Bootstrap macro-stati; layer esterno |
| src-hbm | historical-basemaps | https://github.com/aourednik/historical-basemaps | GPL-3.0 (verificare) | Confronto\[1\] |
| src-ohm | OpenHistoricalMap | https://www.openhistoricalmap.org | CC0 | Confini dove presenti; modello date\[51\] |
| src-awmc | AWMC geodata | https://github.com/AWMC/geodata | ODbL 1.0 | Coste antiche, estensioni e province romane |
| src-pleiades | Pleiades | https://pleiades.stoa.org | CC BY 3.0 | Luoghi antichi |
| src-dare | DARE | https://dh.gu.se/dare/ | CC BY 4.0 (tiles) | Basemap romana |
| src-istat-confini | ISTAT confini storici | https://www.istat.it/notizia/confini-statistico-amministrativi-analisi-storica/ | Open data (verificare) | UTA 1861-1981 |
| src-istat-situas | ISTAT SITUAS | https://situas.istat.it/web/ | Open data | Variazioni dei comuni |
| src-cshapes | CShapes 2.0 | https://icr.ethz.ch/data/cshapes/ | CC BY-NC-SA 4.0 | Stati e colonie 1886-2019 |
| src-ne | Natural Earth | https://www.naturalearthdata.com | Dominio pubblico | Basemap |
| src-wikidata | Wikidata | https://query.wikidata.org | CC0 | Candidati |
| src-commons | Wikimedia Commons | https://commons.wikimedia.org | Per file | Immagini |
| src-rumsey | David Rumsey | https://www.davidrumsey.com | CC BY-NC-SA 3.0 | Overlay raster\[52\]\[53\] |
| src-euratlas-ref | Euratlas | https://www.euratlas.net | Commerciale | **Solo consultazione** |
| src-centennia-ref | Centennia | https://historicalatlas.com | Proprietaria | Solo consultazione\[12\] |
| src-treccani / src-dbi | Treccani, Dizionario Biografico degli Italiani | https://www.treccani.it | Copyright | Citazione di fatti, non copia |
| src-unesco | UNESCO WHC | https://whc.unesco.org | Termini UNESCO | Verifica siti |

Regole: i derivati AWMC restano ODbL; CShapes e Rumsey non si usano commercialmente; codice MIT; dati curati propri in CC BY-SA 4.0.

## 9. Schema cromatico e cartografia delle dipendenze

### 9.1 Principi
1. **Famiglia di colore = sovrano supremo** (`root_sovereign`) nella modalità attiva.
2. **Tinta = profondità di dipendenza**: sovrano saturo, vassallo di 1° livello più chiaro, 2° ancora più chiaro; fratelli distinti da rotazioni di tonalità di ±8° e dai bordi.
3. **Bordo interno** (5-6 px a zoom 6) nel colore del sovrano diretto, come in Euratlas: "plain color fill surrounded by a dotted line whose color indicates the dominant or 'owner' state".\[37\]
4. **Sovranità nominale** (es. SRI sui comuni dopo il 1183) come **linea sovrapposta**, non come riempimento (Euratlas: "A purple continuous line marks the boundaries of the Holy Roman Empire"); toggle per mostrarla come famiglia.\[37\]
5. **Contesa / condominio**: riempimento del possessore de facto più **tratteggio diagonale** del pretendente in un layer `fill-pattern` sovrapposto. La colorazione SDF dei pattern non è implementata in MapLibre GL JS: serve uno sprite pre-colorato per ogni colore.\[54\] Condominio a righe alternate.
6. **Occupazione militare**: tratteggio a puntini nel colore dell'occupante.
7. **Confine incerto**: tratteggio grigio o sfumatura verso il bianco ("Graduate colors towards white… shows uncertain boundaries", Euratlas).\[55\]
8. **Popoli preromani**: campiture poco sature, bordi sfumati, etichette in corsivo, legenda "area di insediamento prevalente".

### 9.2 Palette (ancore da Paul Tol "muted", colour-blind safe, da schiarire per i riempimenti)
| Polo | Ancora | Esempi |
|---|---|---|
| Roma | #882255 | Province, municipia, coloniae |
| Bisanzio | #332288 | Esarcato, Ducato romano, Catapanato, Sicilia bizantina |
| Longobardi | #999933 | Regno, Spoleto, Benevento |
| Regno d'Italia medievale / SRI | #DDCC77 | Marche, contee, feudi, vicariati |
| Papato | #AA4499 | Legazioni, vicariati apostolici, Benevento |
| Islam (Emirato di Sicilia, Bari) | #117733 | — |
| Regno di Sicilia/Napoli autonomo (Normanni → Borbone) | #44AA99 | — |
| Aragona / Spagna | #CC6677 | Sicilia, Sardegna, Napoli, Milano 1535-1706, Presidi |
| Francia (Valois, Napoleone, satelliti) | #88CCEE | Repubbliche sorelle, Corsica dal 1768 |
| Austria | #A6761D *(da validare)* | Lombardo-Veneto, secondogeniture in tinta chiara |
| Venezia | #B2182B *(da validare)* | Dogado, Terraferma, Stato da Mar |
| Genova | #4477AA | Riviere, Corsica fino al 1768 |
| Savoia → Regno d'Italia | #1F4E9E *(da validare)* | Piemonte, Nizza, Sardegna dal 1720 |
| Indipendenti minori | qualitativa neutra poco satura | Lucca, Siena, San Marino, Ragusa |
| Dato mancante | #DDDDDD a puntini | — |

> Validare con simulatori di deuteranopia, protanopia e tritanopia. I riempimenti chiari adiacenti raramente raggiungono 3:1: il **bordo** è obbligatorio e deve avere contrasto ≥ 3:1.

### 9.3 Algoritmo (`src/lib/colors.ts`)
```
color(polity, t, mode):
  chain = sovereigntyChain(polity, t, mode, strength="effective")
  root  = chain.last ?? polity
  base  = FAMILY[root.family] ?? graphColor(root.id)   // 4-6 colori per neutri adiacenti
  depth = chain.length - 1
  return oklch(clamp(base.L + depth*12, …, 92), base.C*(1 - depth*0.25), base.h + siblingOffset(polity, t))
```
La legenda mostra solo le famiglie presenti nell'anno più i pattern (contesa, occupazione, incerto).

### 9.4 Etichette
Sovrani in maiuscoletto grassetto, vassalli in tondo grigio (convenzione Euratlas), popoli in corsivo;\[55\] i minori si nascondono sotto zoom 7.

## 10. Periodizzazione e contenuti
> Date convenzionali della manualistica; dove sono discusse, `certainty: "medium"`. Questo è uno **scheletro**, non testo definitivo: ogni contenuto va scritto con fonti.

### 10.1 Epoche
| # | Epoca | Intervallo | Attori principali | Personaggi (ruolo) | Architettura emblematica |
|---|---|---|---|---|---|
| 1 | Popoli preromani | c. 900 – 509 a.C. | Villanoviani/Etruschi, Latini, Sabini, Umbri, Sanniti, Veneti, Liguri, Celti, Nuragici, Magna Grecia (Cuma, Siracusa, Taranto), Fenici/Cartaginesi (Mozia, Tharros, Nora) | Re di Roma leggendari; tiranni di Siracusa | Su Nuraxi (Barumini); necropoli di Cerveteri e Tarquinia; Paestum; Agrigento |
| 2 | Roma repubblicana | 509 – 27 a.C. | Repubblica, Lega latina (sciolta 338), Sanniti, Pirro, Cartagine (264-146), Gallia Cisalpina | Appio Claudio (via Appia 312); Scipione; Gracchi; Mario, Silla; Cesare; Cicerone | Via Appia; santuario di Palestrina; Pompei repubblicana |
| 3 | Alto e medio Impero | 27 a.C. – 284 | 11 regiones augustee; province di Sicilia, Sardegna e Corsica | Augusto; Traiano (massima espansione 117); Adriano; Caracalla (212) | Ara Pacis; Colosseo; Pantheon; Villa Adriana |
| 4 | Tardo antico | 284 – 476 | Tetrarchia; Milano (286) e Ravenna (402) capitali; Occidente dal 395 | Diocleziano; Costantino (313); Ambrogio; Stilicone; Odoacre | Laterano; Santa Maria Maggiore; Mausoleo di Galla Placidia |
| 5 | Odoacre e Ostrogoti | 476 – 553 | Regno ostrogoto (493); Vandali nelle isole | Teodorico; Boezio; Cassiodoro | Mausoleo di Teodorico; Sant'Apollinare Nuovo |
| 6 | Guerra gotica e Bisanzio | 535 – 568 (presenza bizantina fino al 1071) | Prammatica Sanzione (554); Esarcato (c. 584-751); Ducati di Roma e Napoli; Sicilia fino a 827-902 | Giustiniano; Belisario; Narsete | San Vitale (547); Sant'Apollinare in Classe |
| 7 | Longobardi | 568 – 774 | Regno (Pavia); Spoleto, Benevento; territori bizantini e papali | Alboino; Teodolinda; Rotari (643); Liutprando; Astolfo (751); Desiderio; Gregorio Magno | Sito UNESCO "I Longobardi in Italia": Cividale, Santa Sofia di Benevento, Castelseprio |
| 8 | Carolingi e "re nazionali" | 774 – 962 | Regnum Italiae; Patrimonio di San Pietro; principati longobardi; Napoli, Amalfi, Gaeta; Emirato di Sicilia | Carlo Magno (774, 800); Ludovico II; Berengario I; Ugo di Provenza | Altare di Volvinio (Milano); Cappella di San Zeno (Roma) |
| 9 | Ottoni/Salici e Normanni | 962 – 1130 | Regno d'Italia nel SRI; marca di Toscana; Venezia, Pisa, Genova, Amalfi; Normanni (Aversa 1030; Sicilia 1061-1091) | Ottone I; Matilde di Canossa; Gregorio VII (Canossa 1077); Roberto il Guiscardo; Ruggero I | Romanico: Sant'Ambrogio, Duomo di Modena, Piazza dei Miracoli, San Marco |
| 10 | Età comunale e Regno normanno-svevo | 1130 – 1266 | Comuni (Legnano 1176, Costanza 1183); Regno di Sicilia (1130); Stato della Chiesa; Venezia (1204) | Ruggero II; Barbarossa; Innocenzo III; Federico II; Manfredi; Francesco d'Assisi | Cappella Palatina, Monreale, Cefalù; Castel del Monte; Assisi; broletti |
| 11 | Angioini, Aragonesi, signorie | 1266 – 1454 | Napoli angioina (1266); Sicilia aragonese (1282); Visconti (ducato 1395); Scaligeri, Este, Gonzaga; Firenze medicea (1434); Venezia di Terraferma; Avignone (1309-1377) | Carlo I d'Angiò; Pietro III; Dante, Petrarca, Boccaccio; Gian Galeazzo Visconti; Cosimo il Vecchio; Alfonso V (1442) | Palazzo Pubblico (Siena); Duomo di Orvieto; Duomo di Milano (1386); Palazzo Ducale (Venezia); Cupola del Brunelleschi (1420-1436) |
| 12 | Equilibrio di Lodi | 1454 – 1494 | Milano, Venezia, Firenze, Papato, Napoli più stati minori | Francesco Sforza; Lorenzo il Magnifico; Federico da Montefeltro; Pio II; Ferrante | Palazzo Ducale (Urbino); Pienza; Tempio Malatestiano |
| 13 | Guerre d'Italia | 1494 – 1559 | Francia (1494), Spagna (Napoli 1504), Agnadello (1509), Carlo V (Bologna 1530), Cateau-Cambrésis (1559) | Carlo VIII; Cesare Borgia; Giulio II; Machiavelli; Carlo V; Andrea Doria; Leonardo, Michelangelo, Raffaello | San Pietro; Tempietto di Bramante; Palazzo Te; ville palladiane |
| 14 | Preponderanza spagnola | 1559 – 1713 | Milano, Napoli, Sicilia, Sardegna, Presidi spagnoli; Savoia (Torino 1563); Granducato (1569); Ferrara (1598) e Urbino (1631) al Papa | Emanuele Filiberto; Cosimo I; Carlo Borromeo; Masaniello; Galileo; Bernini; Borromini | Colonnato di San Pietro; Sant'Ivo; Guarini a Torino; Val di Noto dopo il 1693 |
| 15 | Settecento austriaco e borbonico | 1713 – 1796 | Austria (Milano; Napoli 1714-1734); Savoia (Sicilia 1713 → Sardegna 1720); Borbone a Napoli (1734); Lorena in Toscana (1737); Borbone a Parma (1748); Corsica alla Francia (1768) | Vittorio Amedeo II; Carlo di Borbone; Maria Teresa; Pietro Leopoldo; Beccaria; Vanvitelli | Reggia di Caserta; Superga e Stupinigi (Juvarra); La Scala (1778) |
| 16 | Età napoleonica | 1796 – 1815 | Repubbliche sorelle; Campo Formio (1797); Regno d'Italia (1805); Napoli murattiana; Sicilia e Sardegna a Borbone e Savoia | Napoleone; Eugenio di Beauharnais; Murat; Foscolo; Canova | Arco della Pace (Milano); piazza del Popolo (Valadier) |
| 17 | Restaurazione | 1815 – 1848 | Sardegna (+ Liguria), Lombardo-Veneto, Parma, Modena, Lucca (fino al 1847), Toscana, Stato della Chiesa, Due Sicilie (1816)\[56\]\[57\] | Metternich; Carlo Alberto; Mazzini (1831); Manzoni | San Francesco di Paola (Napoli); Caffè Pedrocchi |
| 18 | Risorgimento | 1848 – 1870 | 1848-49; 1859; Mille (1860); Regno d'Italia (17 marzo 1861); Veneto (1866); Roma (20 settembre 1870)\[58\] | Vittorio Emanuele II; Cavour; Garibaldi; Mazzini; Pio IX; Francesco II | Mole Antonelliana; Galleria Vittorio Emanuele II |
| 19 | Italia liberale e colonie | 1870 – 1922 | Eritrea (1890), Somalia, Libia e Dodecaneso (1911-12); Grande Guerra; Trento, Trieste, Istria (1919-20); Zara (1920) | Crispi; Giolitti; Vittorio Emanuele III; D'Annunzio (Fiume) | Vittoriano; Liberty di Ernesto Basile |
| 20 | Fascismo e guerra | 1922 – 1946 | Fiume (1924); Patti Lateranensi (1929); AOI (1936); Albania (1939); Regno del Sud e RSI (1943-45) | Mussolini; Badoglio; Pio XI; Matteotti; Gramsci | Casa del Fascio (Como); EUR; Sabaudia; Asmara (UNESCO 2017) |
| 21 | Repubblica | 1946 – oggi | Referendum (1946); Trattato di Parigi (1947); Territorio Libero di Trieste (1947-54, Osimo 1975); AFIS Somalia (1950-60); regioni (1970) | De Gasperi; Einaudi; Togliatti; Moro; Berlinguer | Torre Velasca; Pirelli; Palazzetto di Nervi; MAXXI; Bosco Verticale |

### 10.2 Anni-snapshot
**MVP (12)**: −500, −218, 14, 400, 600, 800, 1000, 1200, 1454, 1559, 1815, 1861.
**Completa (MVP più)**: −900, −750, −338, −290, −264, −241, −133, −88, −44, 117, 286, 395, 476, 493, 553, 572, 643, 751, 774, 888, 962, 1030, 1100, 1130, 1183, 1250, 1266, 1282, 1300, 1350, 1400, 1494, 1504, 1530, 1600, 1700, 1714, 1720, 1738, 1748, 1768, 1797, 1799, 1810, 1848, 1859, 1860, 1866, 1870, 1912, 1920, 1924, 1936, 1939, 1942, 1944, 1947, 1954, 1975, anno corrente.
Ogni anno-snapshot ha un golden file `tests/golden/<anno>.json` revisionato a mano con fonte.

### 10.3 Contenuti minimi per epoca
Testo introduttivo di 300-500 parole con fonti; almeno 5 eventi, 5 personaggi con ruoli datati, 5 opere geolocalizzate e 1 tappa del Panorama.

## 11. Piano di sviluppo per fasi
**Fase 0 — Setup (1 settimana).** Repo, Vite/React/TS, lint, Vitest, Playwright, CI, deploy Pages. *Accettazione*: dev, test e build verdi in CI; mappa con Natural Earth pubblicata.

**Fase 1 — MVP mappa + slider (3-4 settimane).** Schema v1, pipeline validate → dissolve → tile, 12 snapshot a livello L1, Roma esterna (AWMC 14/117), slider, deep link, pannello base. *Accettazione*: golden test verdi per i 12 anni; cambio anno < 300 ms; 10 casi noti con il sovrano corretto; ogni feature con fonte e certezza; pagina licenze completa.

**Fase 2 — Sovranità, colori, incertezza (3 settimane).** Relazioni, algoritmo colori, modalità de facto / de jure / pretese, pattern, legenda dinamica. *Accettazione*: nel 1600 Milano, Napoli, Sicilia e Sardegna in famiglia "Spagna"; nel 1300 la linea SRI/Regno d'Italia è visibile; almeno 5 contese tratteggiate (Corsica XIV sec., Sardegna giudicale-aragonese, Ferrara 1598, Monferrato, Trieste 1947-54); contrasto dei bordi ≥ 3:1; axe-core pulito.

**Fase 3 — Timeline e dettaglio medievale (4-6 settimane).** Tab Timeline, Panorama (≥ 30 tappe), 2 percorsi tematici, UTA L3 per il Centro-Nord dei secoli XI-XV (≥ 60 entità), snapshot fino al 1494. *Accettazione*: Panorama completabile in E2E; nessun buco topologico; entità "low" marcate.

**Fase 4 — Personaggi e architettura (3-4 settimane).** Schede, layer, ricerca, candidati Wikidata revisionati, immagini Commons. *Accettazione*: ≥ 100 personaggi e ≥ 100 opere con fonti; solo opere esistenti nell'anno; ricerca < 100 ms.

**Fase 5 — Completamento e studio (4+ settimane).** Snapshot fino a oggi, colonie (CShapes), quiz, ripetizione dilazionata, export Anki, PWA, swipe. *Accettazione*: tutti gli snapshot con golden test; deck di prova importato in Anki desktop; Lighthouse ≥ 90 in Performance e Accessibility.

## 12. Rischi e incertezze
| Rischio | Impatto | Mitigazione |
|---|---|---|
| Confini medievali e preromani intrinsecamente approssimativi (giurisdizioni sovrapposte, popoli senza confini lineari) | Alto | `certainty`, bordi sfumati, nota "come leggere la mappa", "aree di insediamento" per i popoli |
| Nessun dataset aperto comunale/feudale per il 1000-1800 | Alto | Digitalizzazione in UTA, priorità alle entità maggiori, "dettaglio non disponibile" esplicito |
| Licenze incompatibili (ODbL, NC-SA, GPL, commerciali) | Medio | Manifest, layer separati per licenza, nessun dato proprietario redistribuito |
| Granularità di Cliopatria (5.000 km², 50 anni salvo rare eccezioni, circa 40 km²) | Medio | Solo macro-stati e layer esterno |
| Date divergenti (leggende, "conv.", inizio d'anno *more veneto* / *ab incarnatione*) | Medio | EDTF, campo `date_convention`, nota nel pannello |
| De facto contro de jure (Medici, SRI, feudo papale di Napoli) | Alto | Doppia modalità, `strength` |
| Incompletezza di Wikidata | Medio | Solo candidati, revisione manuale |
| Troppe famiglie di colore | Medio | Legenda per anno, colorazione a grafo, pattern e bordi |
| Scope creep dei contenuti | Alto | Criteri minimi (10.3), contenuti in Markdown |
| Sostenibilità (historicborders.app oggi non disponibile) | Medio | Hosting statico, nessuna API a pagamento |

## 13. Istruzioni operative per Claude Code
1. Partire da Fase 0 e 1. **Non** generare contenuti storici inventati: dove manca la fonte, `"certainty": "low"` e `"sources": [{"id": "src-todo"}]`; la build `strict` fallisce su `src-todo`.
2. Prima schema e validatori, poi pipeline, poi UI.
3. Ogni PR include i test della feature.
4. Mantenere aggiornati `docs/DATA_SOURCES.md` e `docs/CARTOGRAPHY.md`.
5. Verificare e registrare la licenza di ogni dataset prima di usarlo.
````

---

## Caveats

- **Licenze da verificare prima di pubblicare.** historical-basemaps risulta GPL-3.0 sul repository ma un altro progetto la riporta come CC BY-SA 4.0.\[1\]\[3\] La licenza precisa dei confini storici ISTAT non l'ho verificata. Le tiles DARE sono passate da CC BY-SA a CC BY 4.0.\[28\]\[59\] Per un'app solo personale l'"internal use" di Euratlas è plausibilmente sufficiente; per un'app pubblica servono licenze per singola mappa.\[9\]
- **Che cosa non ho potuto verificare.** Non ho trovato un dataset vettoriale aperto degli stati preunitari 1815-1860: esistono carte storiche e un web-GIS dell'Emilia-Romagna basato su carte 1828-1853, non shapefile nazionali, quindi va digitalizzato.\[60\]\[61\] Non ho analizzato ThenAndNow, le mappe animate su YouTube, né la copertura reale di OpenHistoricalMap in Italia. I "50 milioni di data point" di Chronas e i "confidence scores" di Atlas Pi sono dichiarazioni dei progetti stessi.\[1\]\[33\]
- **Contenuti storici e palette.** Le date dello scheletro sono convenzionali e alcune sono discusse (fondazioni coloniali, esarcato "c. 584", datazione di Castel del Monte). QID e coordinate dell'esempio JSON sono da verificare via SPARQL. Gli hex marcati "da validare" non sono testati per il daltonismo. Per le aree, la nota tecnica di Paul Tol indica lo schema "light" (9 colori) come più adatto alle celle con etichette, e qualifica "pale" e "dark" come "not meant for lines or maps".\[62\]\[63\] La palette Okabe-Ito è un'alternativa colour-blind safe, ma alcuni suoi colori (es. l'arancio #E69F00) non arrivano a 3:1 su bianco.\[64\]\[65\]

## Fonti

1. [GitHub - aourednik/historical-basemaps: Collection of georeferenced boundaries of world countries and cultural regions for use in mapping historical data on global or continental scale · GitHub](https://github.com/aourednik/historical-basemaps)
2. [historical-basemaps/README.md at master · aourednik/historical-basemaps · GitHub](https://github.com/aourednik/historical-basemaps/blob/master/README.md?plain=1)
3. [Historical-Earth/docs/DATA\_SOURCES.md at main · SamiulH25/Historical-Earth · GitHub](https://github.com/SamiulH25/Historical-Earth/blob/main/docs/DATA_SOURCES.md)
4. [OpenHistoricalMap/Tags - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Tags)
5. [OpenHistoricalMap](https://makewithmaplibre.com/products/openhistoricalmap/)
6. [OpenHistoricalMap](https://en.wikipedia.org/wiki/OpenHistoricalMap)
7. [Euratlas-Info](http://euratlas.blogspot.com/)
8. [Euratlas Shop: Georeferenced Historical Vector Data 1100](https://www.euratlas.net/shop/maps_gis/gis_1100.html)
9. [Euratlas Periodis Web FAQ: And the GIS Data?](https://www.euratlas.net/history/europe/gis.html)
10. [The Historical Vector Maps of Europe: request for license procedure](https://euratlas.com/shop/TermsAndAgreement.html)
11. [Centennia Historical Atlas](https://www.amazon.com/Centennia-Historical-Atlas/dp/0970477104)
12. [HistoricalAtlas.com: The CENTENNIA Historical Atlas, Europe and the Middle East, 1000AD to the Present](https://historicalatlas.com/)
13. [GeaCron on X: "GeaCron Premium, an Interactive World #History Atlas since 3000 BC & Timelines. Now Globe view! Explore this new feature https://t.co/M0PglG2vxv https://t.co/LqbUnMwOYm" / X](https://x.com/geacron/status/1080233066898120704)
14. [Offer World History Atlas since 3000 BC](http://geacron.com/offer/)
15. [offer\_old](https://geacron.com/offer_old/)
16. [GeaCron History Maps for Android — \$3.49 on Google Play](https://geacron.andro.io/)
17. [Cshapes 2.0](https://www.loc.gov/item/2023592015)
18. [CShapes Dataset of Historical Country Boundaries](https://demo.ldproxy.net/cshapes/collections)
19. [Confini statistico-amministrativi: analisi storica](https://www.istat.it/it/archivio/231601)
20. [Confini statistico-amministrativi: analisi storica](https://www.istat.it/notizia/confini-statistico-amministrativi-analisi-storica/)
21. [Nasce Sistat, Sistema Informativo sulle amministrazioni territoriali dal 1861 ad oggi](https://www.istat.it/it/archivio/48427)
22. [Home - SITUAS](https://situas.istat.it/web/)
23. [GitHub - mqAncientHistory/Lat-Epig: The Lat-Epig interface allows you to query the EDCS and save the search result in a TSV file and plot the results on a map of the Roman Empire without any prior knowledge of programming. · GitHub](https://github.com/mqAncientHistory/Lat-Epig)
24. [GitHub - MatteoMazzamurro/roman-road-networks: Construction and analysis of the road network of the Roman Empire. · GitHub](https://github.com/MatteoMazzamurro/roman-road-networks)
25. [GitHub - AWMC/geodata: The geodata collection of the Ancient World Mapping Center in GeoJSON format. · GitHub](https://github.com/AWMC/geodata)
26. [GitHub - sfsheath/roman-maps](https://github.com/sfsheath/roman-maps)
27. [Digital Atlas of the Roman Empire - The Digital Classicist Wiki](https://wiki.digitalclassicist.org/Digital_Atlas_of_the_Roman_Empire)
28. [AWOL - The Ancient World Online: Digital Atlas of the Roman Empire](http://ancientworldonline.blogspot.com/2014/04/digital-atlas-of-roman-empire.html)
29. [Wikidata:SPARQL query service/queries/examples - Wikidata](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples)
30. [head of state - Wikidata](https://www.wikidata.org/wiki/Property:P35)
31. [Downloadable Georeferenced Historical Maps - Historical GIS & Geospatial Analysis - LibGuides at California State University, Fullerton](https://libraryguides.fullerton.edu/c.php?g=1485110&p=11076178)
32. [Finding CC Maps - Creative Commons Works - LibGuides at California State University, Fullerton](https://libraryguides.fullerton.edu/c.php?g=189823&p=10668896)
33. [Chronas: History map application with over 50 million data points which every registered](https://alternativeto.net/software/chronas-org/about/)
34. [GitHub - daumann/chronas-application: History application of the Chronas project · GitHub](https://github.com/daumann/chronas-application)
35. [Running Reality - Documentation - Custom Historical Map](https://www.runningreality.org/docs/tutorial/customhistoricalmap.jsp)
36. [CENTENNIA (formerly Centennia Historical Atlas) - Download - Softpedia](https://www.softpedia.com/get/Others/Home-Education/Centennia-Historical-Atlas.shtml)
37. [Euratlas Periodis Web - Map Legend](https://www.euratlas.net/history/europe/legend.html)
38. [GitHub - OpenHistoricalMap/maplibre-gl-dates: MapLibre GL JS plugin for filtering the map based on a date · GitHub](https://github.com/OpenHistoricalMap/maplibre-gl-dates/)
39. [wiki.openstreetmap.org](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap%2FReuse)
40. [OpenHistoricalMap/Tags/Key/start\_date - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Tags/Key/start_date)
41. [GitHub - chronoatlas-org/chronoatlas: Open-source interactive historical atlas: watch borders change through time, with every border and event traced to a named source. · GitHub](https://github.com/chronoatlas-org/chronoatlas)
42. [Self-host Maps with Protomaps and Supabase Storage](https://supabase.com/blog/self-host-maps-storage-protomaps)
43. [Protomaps - The open source map in a file](https://protomaps.com/)
44. [maplibre-agent-skills/skills/maplibre-pmtiles-patterns/SKILL.md at main · maplibre/maplibre-agent-skills · GitHub](https://github.com/maplibre/maplibre-agent-skills/blob/main/skills/maplibre-pmtiles-patterns/SKILL.md)
45. [WCAG color contrast requirements, explained](https://wcagc.com/blog/color-contrast-requirements-explained)
46. [PMTiles: single-file map tiles, install and viewer](https://hysenlabs.com/en/projects/protomaps-pmtiles)
47. [Cliopatria - A geospatial database of world-wide political entities from 3400BCE to 2024CE](https://www.nature.com/articles/s41597-025-04516-9)
48. [Property talk:P35 - Wikidata](https://www.wikidata.org/wiki/Property_talk:P35)
49. [Wikidata:WikiProject British Politicians/Building Queries - Wikidata](https://www.wikidata.org/wiki/Wikidata:WikiProject_British_Politicians/Building_Queries)
50. [GitHub - meccasha/Map\_Tool · GitHub](https://github.com/meccasha/Map_Tool)
51. [OpenHistoricalMap · GitHub](https://github.com/openhistoricalmap)
52. [The joy of David Rumsey](https://www.legalgenealogist.com/2020/12/23/the-joy-of-david-rumsey/)
53. [David Rumsey Historical Map Collection](https://www.davidrumsey.com/about/copyright-and-permissions)
54. [Layers - MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/layers/)
55. [Euratlas Periodis Web - Explanation and FAQ](https://www.euratlas.net/history/europe/explanation.html)
56. [Gli stati italiani preunitari](https://milanosifastoriabl.wixsite.com/fifi/gli-stati-italiani-preunitari)
57. [Stati italiani dal Congresso di Vienna all'unità d'Italia](https://it.wikipedia.org/wiki/Stati_italiani_dal_Congresso_di_Vienna_all'unit%C3%A0_d'Italia)
58. [Gli stati italiani dopo il Congresso di](https://www.storiadelrisorgimento.it/gli-stati-italiani-dopo-il-congress)
59. [Pelagios: A digital map of the Roman Empire](https://pelagios-project.blogspot.com/2012/09/a-digital-map-of-roman-empire.html?m=1)
60. [Mappa dell’Italia nel 1815](https://www.storiaememoriadibologna.it/archivio/opere/mappa-dellitalia-nel-1815)
61. [663 Atti 15a Conferenza Nazionale ASITA - Reggia di Colorno 15-18 novembre 2011](http://atti.asita.it/ASITA2011/Pdf/193.pdf)
62. [SRON/EPS/TN/09-002 · issue 3.2 · 18 August 2021 · 1/18 Colour Schemes](https://sronpersonalpages.nl/~pault/data/colourschemes.pdf)
63. [Paul Tol's Colour Schemes • khroma](https://khroma.archaeo.science/articles/tol.html)
64. [Okabe-Ito Palette Hex Codes for Python, R & CSS](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference)
65. [Okabe-Ito Palette HEX & RGB Codes (Wong) for R, Python & Prism](https://figcanvas.com/blog/okabe-ito-palette-hex-rgb-wong-prism)
