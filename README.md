# Atlante d'Italia

Atlante storico interattivo d'Italia dal 900 a.C. a oggi: confini politici per anno, sovranità
de facto e de jure, pretese e occupazioni, regnanti ed eventi, ogni dato con fonte e grado di certezza.
Requisiti completi in [`CLAUDE.md`](CLAUDE.md).

Stack: Vite + React + TypeScript, MapLibre GL JS 6, Zustand, Zod; pipeline dati in Node (mapshaper);
hosting statico.

## Avvio rapido

```bash
npm ci
```

```bash
npm run data:fetch
```

```bash
npm run data:build
```

```bash
npm run dev
```

`data:fetch` scarica Cliopatria v0.2.1 (~46 MB) e Natural Earth v5.1.2 in `data/raw` verificandone gli
SHA-256; `data:build` valida i dati curati e genera `public/data` (~13 MB, ~3 MB compressi).

## Comandi

| Comando                             | Cosa fa                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run data:validate`             | Schema, integrità referenziale, coerenza temporale, un solo possessore de facto per UTA/anno |
| `npm run data:validate:strict`      | Come sopra, ma fallisce anche sui segnaposto `src-todo`                                      |
| `npm run data:build`                | Pipeline completa → `public/data` (deterministica)                                           |
| `npm test`                          | Test unitari e golden test per anno-snapshot (Vitest)                                        |
| `npm run test:e2e`                  | Test E2E e accessibilità (Playwright + axe-core; richiede `npm run build`)                   |
| `npm run lint`, `npm run typecheck` | ESLint, TypeScript strict                                                                    |
| `npm run build`                     | Build statica in `dist` (`ATLAS_BASE=/repo/` per GitHub Pages)                               |

## Che cosa c'è (fasi 0-1 e parte della 2)

- Mappa con basemap neutra, layer politico filtrato per anno lato client, slider a scala non lineare per
  epoche con tacche, play/velocità, tastiera e input «218 a.C.», deep link
  (`#y=1454&z=6&c=12.5,42.5&mode=defacto`).
- **Tutte le epoche** con i confini L1 di Cliopatria (CC BY 4.0), mappati a nomi italiani e famiglie di
  colore; inset «Orizzonti esterni» per Roma, Bisanzio, Venezia, Genova, Aragona/Spagna, Regno d'Italia.
- **1815-1914 a grana fine** con il modello a UTA: 118 unità, 47 righe di possesso (de facto, de jure,
  pretese), occupazioni militari, catena di sovranità e colori per profondità. Casi: Repubblica di
  San Marco e Sicilia rivoluzionaria (1848), Province Unite (1859), annessioni del 1860, Veneto (1866),
  Roma e Vaticano (1870).
- Pannello di dettaglio con regnanti, catena di sovranità, eventi ±25 anni, pretese, fonti cliccabili,
  link Wikipedia/Wikidata; legenda dinamica; ricerca; tab Epoche; pagina Fonti e licenze dal manifest.
- 54 persone, 67 regni, 99 eventi, 35 luoghi: tutti con fonte e certezza, ma in stato `draft`.
- 18 golden file (78 casi, 3 deviazioni note di Cliopatria dichiarate), 18 test E2E, axe-core pulito.

## Che cosa manca (onestamente)

- **Medioevo ed età moderna a grana di comuni e signorie** (fase 3): prima del 1815 si vedono solo i
  macro-stati di Cliopatria. Le carte di qualità sono proprietarie: serve digitalizzazione propria.
- Personaggi e architettura come schede e layer (fase 4); timeline guidate con testi (fase 3); quiz,
  export Anki, PWA, swipe tra anni (fase 5).
- PMTiles: per ora GeoJSON (alternativa ammessa dai requisiti finché i file restano piccoli).
- La revisione umana dei record `draft` e la validazione della palette per il daltonismo.
- Il cambio anno sotto i 300 ms è misurato solo in rendering software (≈1,1 s in headless con
  swiftshader): va verificato su un browser con GPU.

Dettagli: [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md), [`docs/CARTOGRAPHY.md`](docs/CARTOGRAPHY.md).

## Struttura

```
app/src/{components,state,lib}   UI React, store, librerie condivise (schema Zod, colori, date, scala)
data/curated                     dati curati (JSON): polity, UTA, possessi, relazioni, regni, eventi…
data/raw                         sorgenti scaricate (non versionate) + sources.lock.json
pipeline                         fetch, validate, build (Cliopatria, UTA, basemap, index, manifest)
public/fonts                     glifi Noto Sans (OFL)
tests/{unit,golden,e2e}          Vitest, golden per anno, Playwright
```

## Licenze

Codice MIT; dati curati CC BY-SA 4.0; Cliopatria CC BY 4.0; Natural Earth pubblico dominio;
Noto Sans OFL 1.1.
