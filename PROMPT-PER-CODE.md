# Prompt operativi per Claude Code

Sono i messaggi da incollare a Claude Code, in ordine. Uno per milestone.
Prima di tutto: metti `CLAUDE.md`, la cartella `docs/` e `reference/` nel repo,
poi avvia Claude Code in quella cartella così legge `CLAUDE.md` da solo.

---

## Prompt iniziale (una volta sola)

```
Sei il full stack senior del progetto Kerios. Leggi CLAUDE.md e tutti i file
in docs/ prima di scrivere codice: sono la fonte di verità. Il file
reference/index.html è il prototipo approvato dal PO, usalo come riferimento di
look & feel e di flusso, non come codice da continuare.

Stack vincolato: Vite + React 18 + TypeScript strict, nessun backend, deploy su
GitHub Pages. Architettura a tre strati (ui → domain → io) con il dominio puro e
testato (vedi docs/architettura.md). Rispetta le regole non negoziabili.

Conferma di aver letto i documenti riassumendo in 6 righe: cos'è Kerios, lo
stack, il confine dell'engine, la regola del denominatore n-1 per lo scarto
quadratico medio del Tipo B, e il fatto che Kerios è un SISTEMA DI REGISTRAZIONE
in cui il prelievo ha un ciclo di vita a 3 fasi (verbale→trasmesso→refertato) con
campi opzionali — quindi il modello dati NON va costruito come riga statica.
Poi fermati e aspetta il via per la milestone M0.
```

---

## M0 — Scaffold e deploy

```
Esegui la milestone M0 di docs/roadmap.md.
Crea lo scaffold Vite+React+TS (strict), con ESLint, Prettier, Vitest, e la
struttura cartelle di docs/architettura.md. Configura vite.config.ts con il
base path per GitHub Pages e un workflow GitHub Actions che builda e pubblica su
Pages a ogni push su main. Implementa la Home con le tre porte (Calcestruzzi,
Acciaio, Quadro generale) navigabili, ispirandoti a reference/index.html per lo
stile (token in docs/design.md). Acciaio e Quadro mostrano "in costruzione".
Non implementare ancora calcoli o import.
Fermati e dimmi i criteri di accettazione M0 da verificare.
```

---

## M1 — Engine NTC + test

```
Esegui la milestone M1. Implementa src/domain/cls.ts e src/domain/stats.ts
seguendo ESATTAMENTE docs/dominio-ntc.md, con le firme TypeScript della sezione
3. Lo scarto quadratico medio usa denominatore n-1. Scrivi i test vitest in
src/domain/__tests__/ con TUTTI i casi indicati nella spec (validità prelievo,
Tipo A, Tipo B incluso il caso n=15 Rck=40 non conforme). Nessun import da
React/DOM/IO nel dominio. Mostrami l'output di npm test.
```

---

## M2 — Import + tabella filtrabile

```
Esegui la milestone M2. Implementa src/io/csv.ts (parsing ';', encoding
Windows-1252, virgola decimale, date gg/mm/aaaa) e l'import .xlsx via SheetJS,
con la mappatura colonne dell'appendice di docs/roadmap.md (ricorda il trim di
WBS e il ricalcolo di rmedio da r1,r2). Costruisci la tabella accessibile del
modulo Calcestruzzi con i filtri WBS / parte d'opera / Rck / mix + ricerca
libera, e la colonna "esito prelievo" calcolata con domain/cls.ts. Segui
docs/design.md e reference/ per l'aspetto. Verifica con il file reale del PO.
```

---

## M3 — Selezione e generazione (a schermo)

```
Esegui la milestone M3. Implementa il raggruppamento a tre modalità di
docs/dominio-ntc.md §1.4-quater tramite una funzione raggruppa(prelievi, modo)
con modo 'auto' | 'assistito' | 'manuale', che produce proposte EDITABILI (mai
bloccanti). 'auto' = terzine consecutive; 'assistito' = raggruppa per mix +
parte d'opera + vicinanza temporale; 'manuale' = selezione libera coi filtri.
Aggiungi barra riepilogo sticky, avvisi non bloccanti (mix non omogeneo, parti
miste, >300 m³ se i volumi sono presenti, >45 gg) con conferma flag 'forzato'.
Pannello risultato con Rcm28, Rcmin, Rck effettiva, s, CV, le due disuguaglianze
e l'esito — tutti i calcoli da domain/cls.ts. Verifica che in modalità 'auto' le
Rck effettive coincidano con quelle dell'Excel ST36. Annuncia l'esito via aria-live.
```

---

## M4 — Cartella di lavoro + progetto

```
Esegui la milestone M4 seguendo docs/persistenza.md alla lettera. Implementa
src/io/workspace.ts (showDirectoryPicker, handle in IndexedDB, ensurePermission
con ri-verifica su gesto utente) e src/io/progetto.ts (load/save di
*.kerios.json con scrittura ATOMICA via createWritable). Feature detection con
fallback input/download se l'API non c'è. Gestisci AbortError e NotAllowedError
senza crash. Aggiungi in UI il punto "apri/riapri cartella di lavoro".
```

---

## M5 — Documenti collegati

```
Esegui la milestone M5. Implementa il collegamento dei PDF (verbale, lettera,
certificato) alle celle: drag & drop con getAsFileSystemHandle e picker
alternativo con showOpenFilePicker. Persisti l'associazione codice→handle in
IndexedDB e referenziala nel file di progetto. Click sulla cella apre il PDF.
Nessun vincolo di percorso o nome file.
```

---

## M6 — PDF del controllo

```
Esegui la milestone M6. Crea i template in src/io/pdf/ con @react-pdf/renderer
(testo selezionabile, NON html2canvas), FEDELI al modello ST36 descritto
nell'appendice B di docs/roadmap.md: intestazione a 3 righe (opera / lavori /
elemento+pk), fasce di testata unite (PRELIEVO CAMPIONE / PARTE DI OPERA /
LABORATORIO / RISULTATI DELLE PROVE / Controllo di accettazione "TIPO A"),
colonne nell'ordine indicato con Massa volumica opzionale tra Data e Rck, blocchi
Rmin/Rm/Rck effettiva uniti per terzina, e piè di pagina "IL DIRETTORE LAVORI" +
nome configurabile. Esporta nella cartella di lavoro e offri il download.
Mostrami un PDF generato dai dati ST36 e confrontalo con l'Excel originale.
```

---

## M7 e M8

Da avviare dopo che il PO conferma, rispettivamente, i valori tabellari acciaio
B450C/B450A + struttura registro acciaio (M7) e la coerenza dei nomi opera tra i
registri (M8). Riferirsi a docs/roadmap.md.

```
# M7 (quando confermato dal PO)
Esegui la milestone M7. Implementa domain/acciaio.ts + test secondo
docs/dominio-ntc.md §2: verifica per saggio (fy, Agt, ft/fy, piega; distacco
nodo per la rete) vs Tab. 11.3.VI, soglie dal JSON (sezione "acciaio"),
distinzione barra/rete e B450C/B450A. Import del registro acciaio reale
(header multi-livello, 3 colonne per parametro = 3 saggi, mappatura appendice C),
applicando l'architettura di scala (IndexedDB, partizione per WBS,
virtualizzazione — vedi docs/scala-e-persistenza.md). PDF fedele al modello
ST36 AC1 (§2.5). Prima di iniziare, chiedi al PO i 3 punti DA CONFERMARE.
```

---

## M9 — Inserimento e modifica diretta

```
Esegui la milestone M9. Implementa il form di inserimento del prelievo per fasi
(verbale → trasmesso → refertato, vedi dominio-ntc.md §1.0), con validazione in
inserimento (ricalcolo R medio, avviso prelievo nullo >20%, campi obbligatori
per fase, date coerenti) e liste controllate per opera/parte/laboratorio/mix
(tendina con aggiunta al volo, persistite nel progetto). Aggiungi le viste per
stato ("in attesa di certificato", avviso 45 giorni) e modifica/eliminazione.
CSV/XLSX restano import/export. Il modello dati è già quello di M1, non
ricostruirlo.
```

---

## M10 — Il Cuore (numerazione centrale)

```
Esegui la milestone M10 seguendo docs/numerazione-cuore.md. Crea l'API minima
del Cuore (VPS/serverless gratuito): endpoint di assegnazione progressivo
atomico e idempotente, che custodisce SOLO numeri + codici opachi opera e MAI
dati aziendali. Implementa il client lato Kerios (io/cuore.ts) con la mappa
opaco↔opera tenuta SOLO lato Kerios, e gestione offline/retry con id-richiesta.
Dimostra che richieste concorrenti non collidono e che un retry non consuma due
numeri.
```

---

## M11 — App Verbale leggera (mobile)

```
Esegui la milestone M11. Crea la vista mobile leggera "Verbale" come secondo
punto d'ingresso della STESSA web app (riusa dominio/persistenza/client Cuore,
non duplicare). Flusso: scegli opera+materiale → chiama il Cuore → ricevi
numero/sigle → compila il verbale → firme canvas (operatore + presenti) → logo
configurabile → salva e trasporta il verbale completo verso il Kerios completo
(i dati aziendali NON passano dal Cuore). Cura l'usabilità mobile in cantiere e
lo scenario galleria. Conferma con il PO il layout del verbale prima di rifinire.
```

---

## Regola trasversale per ogni milestone

A fine milestone, Code deve:
1. elencare i criteri di accettazione del PO da verificare;
2. confermare che i test del dominio (se toccato) sono verdi;
3. NON proseguire alla milestone successiva senza il via del PO.
```
