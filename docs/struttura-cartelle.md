# Struttura cartelle e condivisione (modello "verità condivisa" — no sync)

> Decisione PO+CTO. Risolve la domanda "quante persone su Kerios insieme" SENZA
> sync (che complicherebbe enormemente il progetto e tradirebbe il local-first).

## Il problema, e perché NON serve il sync
- Kerios è local-first: i dati stanno in IndexedDB (sul PC di chi lo apre) +
  OneDrive come verità/backup. NON c'è database centrale dei dati aziendali.
- Conseguenza: Kerios desktop è di fatto MONOUTENTE per dispositivo. Un sync
  multiutente concorrente sarebbe costoso e fragile → ESCLUSO.

## La separazione K2/Kerios gioca a favore (intuizione PO)
- CAMPO (K2): ispettori TANTI, ma ognuno sul suo telefono, ognuno il suo
  verbale → nessun conflitto, problema inesistente.
- DESKTOP (Kerios): ci lavorano i RESPONSABILI QUALITÀ, che sono POCHI e non
  fanno prelievi. Non serve multiutente concorrente: serve un sistema di cartelle
  che renda il "copia cartella e incolla" VELOCE e a prova di errore.

## Numeri reali e perché il conflitto è STRUTTURALMENTE IMPOSSIBILE (PO)
Numeri reali (non 50): ~20 operatori qualità in tutto, ~10 su cls e acciaio.
Su un cantiere con ~200 WBS, ogni operatore segue ~4 WBS sue. Quindi il numero
che conta NON è "quanti operatori", ma "quanti toccano la STESSA WBS" → UNO solo.
Ogni cartella WBS ha sempre UN proprietario di fatto: due persone non copiano mai
la stessa cartella `<WBS>/` nella verità condivisa. Il conflitto non è "raro": è
strutturalmente impossibile, perché il lavoro è già partizionato per persona via
WBS. Vale anche con 20-30 operatori: il limite è "due sulla stessa WBS insieme",
che per come ci si organizza NON accade.
> Stesso principio della Lavagna (ognuno tappa le sue WBS): la partizione per WBS
> è il filo che unifica Lavagna + cartelle + persistenza local-first. Architettura
> coerente, non compromesso. Il modello a cartelle è la soluzione CORRETTA, non un
> ripiego per "pochi utenti".

## Modello di condivisione: "verità condivisa" su OneDrive
- Ogni responsabile qualità lavora nella SUA cartella LOCALE (veloce, nessun
  conflitto).
- Esiste UNA cartella "VERITÀ" condivisa su OneDrive (archivio ufficiale).
- Quando un pezzo è pronto, lo si DEPOSITA nella verità con copia-incolla.
- La condivisione avviene per FILE/CARTELLE DEPOSITATI, mai per modifica
  simultanea → niente conflitti, niente sync.
- Stesso principio del trasporto K2→Kerios (cartella OneDrive), esteso a Kerios.

## Requisito CHIAVE: struttura cartelle FISSA e IDENTICA ovunque
La cartella locale di ognuno e la verità condivisa hanno la STESSA struttura.
Così il copia-incolla è banale: si sposta una sottocartella e finisce esattamente
al posto giusto, senza riorganizzare nulla.

## Struttura (decisione CTO)
```
KERIOS/                                  (radice; locale e "verità" identiche)
└─ <COMMESSA>/                           es. Megalotto-3-SS106   (multi-commessa)
   ├─ profilo-commessa.json              intestazione commessa (vedi profilo-commessa.md)
   ├─ calcestruzzo/
   │  └─ <WBS>/                          es. ST11   (unità di lavoro = WBS)
   │     ├─ verbali/                      i .json (da K2) + .docx generati
   │     ├─ pdf/                          i PDF (fatti dall'utente) collegati al registro
   │     └─ allegati/                     DDT, foto, certificati
   └─ acciaio/
      └─ <WBS>/
         ├─ verbali/
         ├─ pdf/
         └─ allegati/                     doc. trasporto, documenti colata, certificati
```
Gerarchia: **Commessa → Materiale → WBS → file**. Motivi:
- Commessa in cima: il software è multi-commessa (vita oltre il Megalotto).
- Materiale subito sotto: cls e acciaio sono mondi diversi (verbali/registri
  diversi); separarli evita confusione.
- WBS come unità: è già il modo in cui ci si divide (Lavagna per WBS).
- Dentro la WBS: verbali (.json/.docx), pdf (collegati), allegati.

## Conseguenza operativa (il copia-incolla)
"Ho finito la WBS ST11 del calcestruzzo" → copio
`<COMMESSA>/calcestruzzo/ST11/` dalla mia locale alla verità condivisa. Un gesto,
una cartella, nessuna ambiguità. Poiché i responsabili qualità sono pochi e
seguono parti diverse, è raro che due tocchino la stessa cartella WBS insieme; se
capita, regola: si DEPOSITA la propria, non si sovrascrive ciecamente (in caso di
dubbio, confronto manuale — sono pochi e si coordinano).

## Implicazioni per Code
- Kerios legge/scrive seguendo QUESTA struttura fissa (File System Access:
  l'utente aggancia la radice KERIOS o una commessa; Kerios naviga le sottocartelle
  note: <materiale>/<WBS>/verbali, /pdf, /allegati).
- L'import dei verbali (JSON da K2) scansiona `*/verbali/*.json` sotto la WBS.
- I PDF prodotti dall'utente si collegano (iperlink) dalla cartella `pdf/`.
- NON implementare sync/merge automatici tra cartelle: la condivisione è manuale
  (copia-incolla dell'utente). Kerios si limita a leggere ciò che trova nella
  struttura, in modo idempotente (re-import non duplica, chiave = numero verbale).
- Partizione per WBS (scala-e-persistenza.md) combacia con questa struttura:
  si lavora una WBS alla volta, una cartella alla volta.

## Cosa NON è
- NON è un sistema multiutente in tempo reale. NON c'è merge automatico.
- NON è un database condiviso. La "verità" è una cartella, non un server.
- È la soluzione CORRETTA per come si lavora: la partizione per WBS dà a ogni
  cartella un proprietario unico, quindi niente conflitti per costruzione (non
  per fortuna). Regge ampiamente i numeri reali (~10-20 operatori, ~200 WBS).
