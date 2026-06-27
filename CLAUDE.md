# KERIOS — Guida per Claude Code

> Questo file è la fonte di verità per lo sviluppo. Leggilo prima di scrivere
> codice. Se una richiesta contraddice queste regole, fermati e segnalalo al PO.

## Cos'è Kerios

Web app **client-side pura** per i **controlli di accettazione** dei materiali
strutturali secondo le **NTC 2018** (D.M. 17/01/2018) e la Circolare 2019:

1. **Calcestruzzi** — § 11.2.5 (controllo Tipo A e Tipo B)
2. **Acciaio** (tondini B450C/B450A) — § 11.3.2 (controllo per lotti ≤ 30 t)
3. **Quadro generale** — vista aggregata automatica per WBS/opera

L'utente (Direttore dei Lavori / studio tecnico) lavora su **registri già
compilati** (CSV/Excel), raggruppa i prelievi e genera i documenti di controllo.

## Ruoli del progetto

- **PO + collaudatore**: l'utente umano. Decide le priorità, valida in cantiere.
- **CTO**: definisce specifiche, architettura, criteri di accettazione (i doc in `/docs`).
- **Full stack senior**: tu, Claude Code. Esegui seguendo le specifiche e i test.

## Stack VINCOLATO (non cambiare senza approvazione del PO)

- **Vite + React 18 + TypeScript** (strict mode).
- **Nessun backend per le app.** Deploy su **Cloudflare Pages** (hosting statico,
  banda illimitata, edge globale, repo privato consentito). Codice sorgente su
  **GitHub** (git): Cloudflare Pages si collega al repo e pubblica a ogni push.
  Il Cuore gira su **Cloudflare Workers** → fornitore unico per tutto l'hosting.
- **Nessun framework UI pesante.** CSS modules o vanilla-extract; no Tailwind
  salvo richiesta esplicita. L'estetica segue `reference/` e `docs/design.md`.
- **Persistenza locale**: File System Access API + IndexedDB per gli handle.
  Nessun dato lascia mai il dispositivo dell'utente.
- **Verbali**: generati per **templating sui template .docx aziendali** forniti
  dal PO (`template_verbale_calcestruzzo.docx`, `template_verbale_acciaio.docx`).
  Si sostituiscono i segnaposto (`{modulo_codice}`, `{modulo_versione}`,
  `{%logo_aziendale}`, `{corpo_html}`) con dati + firme (immagini) → docx
  compilato → esportazione **PDF** (testo selezionabile). Il template è governance
  di qualità aziendale: NON ridisegnare il verbale in codice, riempire il template.
  VIETATO html2canvas/screenshot-to-PDF (verbali-immagine = bassa qualità legale).
- **Altri PDF** (es. documento di controllo ST36, se serve generarlo): valutare
  in milestone; per i verbali la via è il templating docx→pdf, non react-pdf.
- **Parsing CSV/Excel**: `papaparse` per CSV, `xlsx` (SheetJS) per .xlsx.
- **Test**: `vitest`. L'engine di dominio DEVE avere test unitari.

## Regole NON NEGOZIABILI

### 1. Architettura a tre strati, confine sacro
```
ui/         (React)  ──>  domain/  (TS puro)  ──>  io/  (persistenza, parsing, pdf)
```
- `domain/` NON importa nulla da React, dal DOM, da librerie I/O.
  È TypeScript puro, deterministico, testabile in isolamento.
- Tutte le verifiche NTC vivono in `domain/`. La UI non calcola nulla.
- Vedi `docs/architettura.md`.

### 2. L'engine NTC è verificato contro casi noti
- Ogni funzione di verifica (validità prelievo, Tipo A, Tipo B, acciaio) ha
  test in `domain/__tests__/` con casi presi da `docs/dominio-ntc.md`.
- Un errore di calcolo qui è un errore su un documento legale. Tolleranza zero.
- Non "ottimizzare" o riscrivere le formule: implementa ESATTAMENTE la spec.

### 3. Single source of truth
- Un controllo di accettazione esiste in UN solo posto (lo stato/progetto).
- Il "Quadro generale" è una PROIEZIONE derivata, non duplica i dati.

### 3-bis. Kerios è SISTEMA DI REGISTRAZIONE, non solo lettore
- La fonte di verità è il **file di progetto** in Kerios, NON il CSV/Excel.
- L'Excel/CSV è solo import (cantieri storici) ed export (copia), non il modello.
- Un prelievo ha un **ciclo di vita a 3 fasi** (verbale → trasmesso → refertato):
  i campi di fase 2/3 sono OPZIONALI. Vedi dominio-ntc.md §1.0.
- Il modello dati deve reggere l'inserimento incrementale fin dalla M1, anche se
  il form di compilazione (M9) arriva dopo. NON modellare il prelievo come riga
  statica e completa.
- Liste valori (opera/parte/laboratorio/mix/impianto): NON si caricano, si
  **auto-popolano dall'uso** (second brain). Suggerimenti per recenza, pre-
  compilazione delle combinazioni ricorrenti, sempre come proposta mai blocco.
  Vedi docs/second-brain.md. Nessuna AI: statistica locale deterministica.

### 3-ter. Numerazione centrale — il "Cuore" (vedi docs/numerazione-cuore.md)
- I progressivi di verbale/cubetti (cls) e verbale/prelievo (acciaio) sono
  assegnati da un servizio centrale **atomico** (il "Cuore", VPS/serverless free).
- Il Cuore custodisce SOLO numeri + codici opachi opera. MAI dati aziendali,
  nominativi, firme o risultati. Principio di minimizzazione, non negoziabile.
- Kerios è una **famiglia di app** con base condivisa: il "completo" (desktop) e
  il "Verbale" (mobile leggero per operatori). Le app chiamano il Cuore via HTTP
  diretto (NIENTE Telegram). Riusare dominio/persistenza, non duplicare.

### 4. Formato dei dati italiani
- Decimali con **virgola** (`52,8`). Parsing: virgola→punto in ingresso;
  in uscita (export/PDF) si torna a virgola.
- Encoding registri Excel: **Windows-1252** (ISO-8859-1). Decodifica esplicita.
- Date in formato `gg/mm/aaaa`.

### 5. Accessibilità = requisito di prima classe (non un ritocco finale)
- Tabelle semantiche (`<table>`/`<th scope>`), label reali collegate ai controlli.
- `aria-label` parlanti sulle checkbox di selezione riga.
- Esiti annunciati via `aria-live`. Navigazione completa da tastiera, focus visibile.
- Stato comunicato MAI col solo colore (sempre anche testo/icona).
- `prefers-reduced-motion` rispettato.

### 6. File System Access API — gestione corretta (vedi docs/persistenza.md)
- Feature-detect sempre; fallback `<input type=file>` se assente.
- Handle salvati in IndexedDB; al reload **ri-verificare il permesso** con
  `requestPermission({mode})` su gesto utente prima di leggere/scrivere.
- Scritture **atomiche**: `createWritable()` → `write()` → `close()`.
- Gestire `AbortError` (utente annulla) e `NotAllowedError` senza crash.

### 7. Scala reale — local-first con IndexedDB (vedi docs/scala-e-persistenza.md)
- Volumi VERI: ~65.000+ record (13k verbali + 52k cubetti cls, 6k+22k acciaio),
  decine di WBS. Kerios desktop NON carica un CSV in memoria: usa **IndexedDB**
  come archivio + **OneDrive** come verità/backup.
- **Partizionamento per WBS**: si lavora una WBS alla volta → caricare solo quella.
- **Scritture batch** (transazioni bulk), **Web Worker** per import/calcoli massivi,
  **virtualizzazione** della tabella, **indici** sui campi di filtro.
- App Verbale (mobile): nessun problema di scala (solo ultimi 5-10 verbali).
- Il DOMINIO non cambia: cambia solo lo strato persistenza/presentazione.

## Convenzioni di lavoro

- Commit piccoli e descrittivi, in italiano, uno per unità logica.
- Ogni milestone della roadmap si chiude quando i suoi **criteri di accettazione**
  (in `docs/roadmap.md`) sono verificabili dal PO.
- Prima di aprire un nuovo file di grandi dimensioni, proponi la struttura.
- Quando un comportamento normativo non è chiaro, NON improvvisare: chiedi al PO
  e proponi di aggiornare `docs/dominio-ntc.md`.
- `reference/index.html` è il prototipo approvato: usalo come riferimento di
  look & feel e di flusso, non come codice da continuare.

## Documenti di riferimento (leggi in quest'ordine)

1. `docs/dominio-ntc.md` — le regole di calcolo (il cuore).
2. `docs/architettura.md` — strati, tipi, struttura cartelle.
3. `docs/persistenza.md` — cartella di lavoro, handle, file di progetto.
4. `docs/numerazione-cuore.md` — il Cuore (progressivi) e la famiglia di app.
5. `docs/second-brain.md` — persistenza e suggerimenti dall'uso (no AI).
6. `docs/scala-e-persistenza.md` — IndexedDB, partizionamento, performance.
7. `docs/cruscotti.md` — i tre cruscotti (cls, acciaio, combinato).
8. `docs/lavagna-getti.md` — coordinamento ispettori (semaforo WBS condiviso).
9. `docs/flusso-campo-cls.md` — flusso reale del getto cls (per K2/bot).
10. `docs/flusso-campo-acciaio.md` — flusso reale del prelievo acciaio (per K2/bot).
11. `docs/verbali-template.md` — generazione verbali via templating .docx.
12. `docs/design.md` — token visivi e principi UI.
13. `docs/roadmap.md` — milestone e criteri di accettazione.

## Principio K2/Kerios — chi SCRIVE e chi LEGGE (non negoziabile)

Confine architetturale portante del sistema:
- **K2 = chi CREA.** App di campo. Acquisisce i dati del prelievo, prende il
  numero dal Cuore, **raccoglie le firme** (canvas, sul posto), allega foto
  (DDT/colate se può) e **produce il JSON** del verbale. È la SORGENTE del dato.
- **Kerios = chi LEGGE e RICOSTRUISCE.** App desktop. **Importa il JSON** di K2,
  ricostruisce il verbale, lo riempie nel template .docx → documento finale, lo
  collega al registro, fa controlli e cruscotti. È il CONSUMATORE del dato.

Conseguenze (vincolanti):
- Le **firme si acquisiscono SOLO in K2** (dove c'è il firmatario). Kerios NON
  acquisisce firme: le trova già nel JSON (immagini) e le ricostruisce.
- Lo **schema JSON del verbale è il contratto** tra K2 (scrive) e Kerios (legge):
  vive in `kerios-core`, identico da entrambe le parti, non può divergere.
- Il **corpo del verbale** ha due modalità dello stesso contenuto:
  in K2 = FORM da compilare (input + canvas firma);
  in Kerios = RICOSTRUZIONE in sola lettura (dati già presenti, firme = immagini)
  versata nel template per il documento finale.

## Documenti corpo verbale (specifiche campi)
- `docs/contratto-json-k2-kerios.md` — **PRIORITÀ**: come K2 genera il JSON e
  come Kerios lo importa (il contratto in kerios-core). Più importante del design.
- `docs/profilo-commessa.md` — intestazione commessa configurabile (in testa al corpo).
- `docs/corpo-verbale-acciaio.md` — campi del corpo verbale acciaio (da verbale reale).
- `docs/corpo-verbale-cls.md` — campi del corpo verbale cls (da verbale reale ANAS).
- Verbali reali di riferimento in `reference/verbali/`.

## Regola permanente: ricognizione best-practice PRIMA di implementare
Prima di scrivere codice su un'area nuova (libreria, tecnica, integrazione), Code
fa SEMPRE una ricognizione delle migliori pratiche correnti sul web e le porta
nell'audit/diff, con le opzioni valutate e la scelta motivata. Non implementare
a memoria o per abitudine: verificare cosa è lo stato dell'arte ORA.
Critico soprattutto per: docx→PDF client-side (rischio principale, vedi audit),
templating docx + immagini/firme, IndexedDB a grande scala, File System Access,
deploy Cloudflare. Questa regola vale per OGNI milestone.
