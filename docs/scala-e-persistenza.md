# Scala e persistenza — architettura per volumi reali

> NUMERI REALI DEL PO (non stime): ~13.000 verbali e ~52.000 cubetti (cls) +
> ~6.000 verbali e ~22.000 righe (acciaio). Decine di WBS/opere. ~35.000
> verbali storici già in CSV/Excel importabili.
> Questo cambia lo strato di persistenza/presentazione. Il DOMINIO non cambia.

## Principio: Kerios desktop è local-first con DB nel browser

NON "una pagina che carica un CSV in memoria". A questa scala serve un database
client-side vero. Il disco è l'archivio autorevole; la RAM tiene solo ciò che
serve ora. (Coerente con l'intuizione del PO: "non serve la memoria del browser".)

## Le tre superfici, profili di scala diversi

- **App Verbale (mobile)**: NESSUN problema di scala. L'operatore compila singoli
  verbali; gli serve solo un cruscotto con gli ultimi 5-10 verbali. Carica una
  manciata di record, mai l'archivio. Niente virtualizzazione, niente DB pesante.
- **Kerios desktop**: QUI sta la scala. Deve mostrare "la cartella per intero"
  ma una WBS alla volta. Usa IndexedDB + partizionamento + virtualizzazione.
- **Cuore (VPS)**: invariato, solo progressivi.

## Storage: IndexedDB (lavoro) + OneDrive (verità/backup)

- **IndexedDB**: archivio strutturato veloce nel browser (NoSQL transazionale,
  indici per ricerche rapide, pensato per decine di migliaia di record). È lo
  store di lavoro del desktop. Vi si persistono anche i FileSystemHandle.
- **OneDrive (File System Access)**: fonte di verità portabile + backup. Contiene
  i CSV/file di progetto sincronizzati. Kerios sincronizza IndexedDB ⇄ OneDrive.
- Vantaggio: velocità locale (IndexedDB) + portabilità/backup (OneDrive).

## Partizionamento (sharding) per WBS — DECISO

Si lavora una WBS alla volta (più operatori su WBS diverse). Quindi:
- I dati sono partizionati **per WBS** (object store / chiavi per WBS).
- Aprire una WBS carica SOLO quella WBS (centinaia di record → istantaneo).
- Benefici: prestazioni (lettura/scrittura su partizione piccola), concorrenza
  (operatori su WBS diverse = file/partizioni diverse → niente conflitti di
  scrittura, risolve il nodo OneDrive lasciato aperto), aderenza al flusso reale.
- Sharding per object store, NON per database (più efficiente).

## Vista globale (Quadro generale) senza caricare tutto

Il Quadro NON carica i 65.000 record. Legge **indici di sintesi** leggeri:
conteggi, stati, esiti aggregati per WBS/opera. Vedi l'insieme senza pagare il
prezzo dell'archivio intero. I record completi si caricano solo entrando in una WBS.

## Regole di performance (VINCOLANTI per Code)

- **Scritture batch**: il collo di bottiglia di IndexedDB sono le TRANSAZIONI,
  non i dati. Import dello storico (~35.000 verbali) in transazioni batch
  (bulk put), MAI un record per transazione (sarebbe minuti vs secondi).
- **Web Worker**: import massivo, ricalcolo avvisi su molti record e generazione
  indici girano in un Worker, per non congelare la UI.
- **Virtualizzazione tabella**: sul desktop si renderizzano solo le righe visibili
  (~30), non migliaia di nodi DOM. Obbligatoria per WBS grandi.
- **Indici IndexedDB** sui campi di filtro (WBS, Rck, mix, opera, stato, data)
  per ricerche istantanee.
- **Caricamento lazy**: mai "tutto in memoria"; si carica per WBS / a finestre.

## Import dello storico (one-shot, poi incrementale)

- I ~35.000 verbali storici sono in CSV/Excel: import iniziale batch in IndexedDB
  (Web Worker, progress bar). Dedup per chiave (verbale+WBS).
- Dopo l'import, l'uso è incrementale (nuovi verbali via inserimento o cartella).

## Cosa NON cambia

Engine NTC, ciclo di vita, second brain, semafori/avvisi, Cuore, famiglia di app,
documenti PDF: invariati. Cambia SOLO come i dati sono immagazzinati, caricati e
mostrati (strati io/ e tabella UI), che erano già isolati apposta.
