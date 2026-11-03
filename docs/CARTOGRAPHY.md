# Convenzioni cartografiche

Implementazione delle regole di REQUIREMENTS §9 e delle scelte prese durante lo sviluppo.

## Tempo

- Anni astronomici interi (1 a.C. = 0); in interfaccia «a.C./d.C.».
- Intervalli `[start_year, end_year)`: `end_year` è l'anno del cambiamento.
- **La mappa dell'anno Y mostra la situazione dopo i cambiamenti avvenuti in Y** (es. 1860: il
  Mezzogiorno è già annesso al Regno di Sardegna, anche se Gaeta capitolò nel febbraio 1861; la nota del
  record lo segnala). È la stessa semantica di `FromYear` in Cliopatria.
- Nessuna interpolazione geometrica; crossfade di 200 ms tra due serie di layer (A/B).
- Slider a scala non lineare: ogni epoca ha un `weight` in `data/curated/eras.json`.

## Layer politici

| Layer           | Periodo               | Fonte            | Precedenza               |
| --------------- | --------------------- | ---------------- | ------------------------ |
| Cliopatria (L1) | −899 → oggi           | `src-cliopatria` | sotto                    |
| Curato a UTA    | 1815 → 1915 (escluso) | `data/curated`   | sopra (copre Cliopatria) |

Il layer curato assegna la sovranità a **118 UTA**: le 110 province italiane di Natural Earth più
San Marino, Vaticano, Nizza, Savoia, Corsica, Ticino, Istria croata e Malta. Le province moderne
approssimano i confini storici; le UTA miste (Pavia, Piacenza, Lucca, Massa-Carrara, Latina,
Frosinone, Benevento) hanno `certainty: low` e un tratteggio grigio. Le enclavi (Benevento,
Pontecorvo) non sono rappresentabili a questa grana: lo dicono le note.

Dissolve: la pipeline raggruppa le UTA per entità e per intervallo, poi fonde i gruppi a lotti di UTA
disgiunte (copie sovrapposte nello stesso layer rompono la topologia di mapshaper).

## Livelli di dettaglio (RF-MAP-05)

- **L1 Stati**: un colore qualitativo per entità (`fill_state`), indipendente dalla sovranità.
- **L2 Sovranità** (default): famiglia di colore del sovrano supremo, tinta più chiara con la profondità.
- **L3 Dettaglio**: come L2, più i confini delle UTA e le etichette dei vassalli.

## Modalità di sovranità (RF-MAP-06)

- _de facto_ (default) e _de jure_ filtrano i possessi curati (`mode`); dove manca un record de jure si
  usa quello de facto. Esempi: 1859 (governi provvisori de facto, sovrani legittimi de jure fino ai
  plebisciti del 1860), 1860 nel Mezzogiorno, Vaticano 1870-1915.
- _mostra pretese_: tratteggio diagonale nel colore del pretendente (Stato della Chiesa 1860-1870,
  Santa Sede 1870-1915 sui territori ex pontifici).
- Occupazione militare (solo de facto): puntini nel colore dell'occupante (Austria nelle Legazioni
  1849-1859, Francia a Roma 1849-1866 e 1867-1870).

## Colori (§9.2-9.3)

- Ancore della palette Paul Tol «muted» dove indicate dai requisiti; famiglie aggiuntive marcate
  `toValidate` in `app/src/lib/colors.ts` (Austria, Venezia, Savoia, Milano, Firenze, preromani, ecc.).
- Riempimento in OKLCH con luminosità ≥ 0,76 (0,68 per Venezia, 0,72 per Savoia, per non confonderle
  con Aragona e Genova una volta schiarite), +0,05 per livello di dipendenza o `tint_offset`.
- Bordo scurito finché il contrasto con il proprio riempimento non è ≥ 3,2:1 (test automatico ≥ 3:1,
  WCAG SC 1.4.11).
- `tint_offset` è una **scelta cartografica** (es. secondogeniture asburgiche: Toscana e Modena in
  Austria chiaro), non un'affermazione storica di dipendenza.
- Linea viola continua: contorno del composito «(Holy Roman Empire)» di Cliopatria (sovranità nominale).
- Grigio a puntini: terra senza dati politici («dato non disponibile»).
- Bordo tratteggiato: feature a certezza bassa (popoli, poligoni anteriori al 500 a.C.).

Da validare: simulazione di deuteranopia/protanopia/tritanopia della palette completa; alcune coppie
adiacenti restano simili (Genova/Savoia, Francia/Savoia nel Quattrocento) e sono distinte solo da
bordi ed etichette.

## Etichette (§9.4)

Sovrani in maiuscolo Noto Sans Medium, vassalli in tondo grigio (visibili in L3), popoli in corsivo.
Le etichette Cliopatria sotto il layer curato sono nascoste negli anni 1815-1914.

## Regola editoriale di certezza per Cliopatria

Cliopatria non fornisce un grado di certezza: la pipeline assegna `low` a popoli e poligoni che
terminano prima del 500 a.C., `medium` agli altri.
