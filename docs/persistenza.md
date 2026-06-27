# Persistenza e cartella di lavoro

> Basato sulle best practice correnti (WICG File System Access spec, Chrome for
> Developers, MDN). L'obiettivo: lavorare su una cartella locale, con backup su
> OneDrive via sincronizzazione, senza backend e senza vincoli di percorso.

## Modello

1. L'utente sceglie una **cartella di lavoro** (`showDirectoryPicker({mode:'readwrite'})`).
2. Dentro la cartella vivono: il **file di progetto** `*.kerios.json`, i registri
   CSV/XLSX, e i PDF di verbali/lettere/certificati. OneDrive sincronizza la cartella.
3. L'app salva l'handle della cartella in **IndexedDB** per ritrovarla al riavvio.

## Requisiti tecnici (DA RISPETTARE)

### Feature detection + fallback
```ts
const supported = 'showDirectoryPicker' in window;
```
Se NON supportato (Firefox, Safari, mobile): degradare a `<input type="file">`
per import e a download classico per export. Mostrare un avviso chiaro che la
modalità "cartella di lavoro" richiede Chrome o Edge desktop.

### Permessi: ri-verifica al riavvio (INSIDIA NOTA)
Un handle ripreso da IndexedDB può avere permesso `prompt` anche se prima era
`granted`. La PRIMA scrittura dopo il reload lancia `NotAllowedError` se non si
ri-chiede il permesso.
```ts
async function ensurePermission(handle, mode = 'readwrite') {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  // requestPermission DEVE essere chiamato in risposta a un gesto utente (click)
  return (await handle.requestPermission(opts)) === 'granted';
}
```
La UI deve quindi avere un punto di "riapri cartella di lavoro" cliccabile al
ritorno sull'app, prima di leggere/scrivere.

### Scritture atomiche
```ts
const fileHandle = await dirHandle.getFileHandle('progetto.kerios.json', { create: true });
const w = await fileHandle.createWritable();   // crea un file temporaneo
await w.write(JSON.stringify(stato, null, 2));
await w.close();                                // solo ora atterra su disco
```
Mai scrivere senza `createWritable` (rischio corruzione del file su OneDrive).

### Gestione errori
- `AbortError`: l'utente ha annullato il picker → non è un errore, ignora.
- `NotAllowedError`: permesso negato → ripeti `ensurePermission` su click.
- I/O lento (drive di rete / OneDrive): mostrare progress su operazioni lunghe.

## Documenti collegati (verbali / lettere / certificati)

L'utente collega un PDF a una cella in due modi:
1. **Drag & drop** del file sulla cella → `DataTransferItem.getAsFileSystemHandle()`.
2. **Picker** (`showOpenFilePicker`) selezionando il file nella cartella.

L'app memorizza `codice → FileSystemFileHandle` (in stato + persistito in
IndexedDB e referenziato nel file di progetto). Click sulla cella → apre il PDF
(`getFile()` → `URL.createObjectURL` → nuova scheda/viewer).

> Nessun percorso assoluto: l'associazione è per handle, quindi resta valida
> anche se la cartella viene spostata o aperta su un altro PC sincronizzato
> (previa ri-concessione del permesso).

## File di progetto `*.kerios.json` (formato)

Serializzazione dello stato di dominio:
```jsonc
{
  "versione": 1,
  "creato": "2026-06-25T10:00:00Z",
  "aggiornato": "2026-06-25T10:30:00Z",
  "registroClsFile": "Registro_CLS_ST11.csv",
  "controlli": [
    {
      "id": "ctrl-001",
      "tipo": "A",
      "rck": 40,
      "mix": "C40S4D25XA2-1MX - 01-20/2022",
      "wbs": "ST11",
      "prelieviIds": ["CLS 5953", "CLS 5967", "CLS 6497"],
      "esito": "conforme",
      "generato": "2026-06-25T10:25:00Z"
    }
  ],
  "documenti": { "CLS 5607": { "handleRef": "idb:doc:CLS-5607" } }
}
```
Gli handle veri stanno in IndexedDB; nel JSON ci sono i riferimenti.

## Collaborazione 2–3 persone (OneDrive)

- Non concorrente: ognuno apre il progetto, salva, OneDrive sincronizza. OK.
- Mitigazione conflitti: mostrare `aggiornato` (timestamp) e avvisare se il file
  su disco è più recente di quello in memoria ("ultimo salvato vince", con avviso).
- NON serve un backend. Se in futuro servisse co-editing reale, valutare allora.
