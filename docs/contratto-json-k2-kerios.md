# Contratto JSON K2 ↔ Kerios — il cuore del sistema

> PRIORITÀ ASSOLUTA (PO): la cosa più importante non è il design di K2 (che pure
> va fatto bene), ma COME K2 genera il JSON e COME Kerios lo importa. Questo è il
> contratto. Se diverge, tutto il resto crolla. Vive in `kerios-core`, condiviso.

## Principio (vedi CLAUDE.md, non negoziabile)
- **K2 CREA**: produce il JSON del verbale (dati + numero dal Cuore + firme).
- **Kerios LEGGE/RICOSTRUISCE**: importa il JSON, ricostruisce verbale, riempie
  il template, collega al registro, controlli, cruscotti.
- Lo schema JSON è IDENTICO da entrambe le parti (kerios-core) → non diverge mai.

## K2 vive FUORI da Kerios
K2 è un'app separata (mobile/campo). NON condivide il codice applicativo di
Kerios. Condivide SOLO `kerios-core`: i tipi di dominio + lo schema JSON + il
client del Cuore. Il punto di contatto tra le due app è il FILE JSON (più la
cartella OneDrive di trasporto, vedi numerazione-cuore.md).

## Requisiti del contratto JSON
1. **Versionato**: ogni JSON porta `schemaVersion`. Kerios sa leggere versioni
   precedenti (compatibilità). Mai un JSON senza versione.
2. **Autosufficiente**: contiene tutto ciò che serve a Kerios per ricostruire il
   verbale SENZA dipendere da stato di K2 (le firme come immagini base64/embedded,
   i dati del profilo commessa usati, il numero già assegnato, ecc.).
3. **Materiale esplicito**: `materiale: "cls" | "acciaio"` → Kerios sa quale
   corpo/template usare.
4. **Numero già consumato**: il numero (CLS/n, AC1/n) è già nel JSON, assegnato
   dal Cuore alla chiusura. Kerios NON riassegna.
5. **Idempotenza import**: importare due volte lo stesso JSON non crea doppioni
   (chiave = numero verbale). Kerios riconosce un verbale già importato.
6. **Firme**: immagini (canvas → PNG) dentro il JSON. Kerios le ricostruisce nel
   documento. MAI testo, MAI riferimenti a file esterni che potrebbero mancare.

## Struttura JSON (bozza — Code rifinisce, PO valida)
```jsonc
{
  "schemaVersion": "1.0",
  "materiale": "cls",                 // "cls" | "acciaio"
  "numeroVerbale": "CLS/12",          // dal Cuore, display
  "operaOpaca": "OPERA-7",            // codice opaco (mappa opera sta in Kerios)
  "dataPrelievo": "2026-06-27",
  "profiloCommessa": { /* snapshot al momento del verbale */ },
  "testata": { /* luogo, wbs, descrizione, parte, progressiva... */ },
  "datiGenerali": { /* DL, incaricati... */ },
  "ddt": { /* n, mix, targa, classe, pompa, esposizione, fornitore, impianto */ },
  "datiPrelievo": { /* ora, eseguitoDa, tempAmb, tempCls, casseforme, slumpMm */ },
  "provini": [                        // cls: lettere; numero anche dispari
    { "lettera": "A", "note": "" },
    { "lettera": "B", "note": "" }
  ],
  "confezionamento": { /* assestamento, maturazione, cubettiere, nLab... */ },
  "note": "…",
  "presenti": [                       // firme acquisite in K2
    { "ruolo": "Impresa Esecutrice", "nome": "…", "firmaPng": "data:image/png;base64,…" }
  ],
  "allegati": [                       // DDT (cls) / doc trasporto+colate (acciaio)
    { "tipo": "DDT", "nomeFile": "…", "rif": "…" }
  ],
  "statoFirma": "bozza",              // "bozza" | "firmato"
  "correzioni": [                     // SOLO se firmato: traccia modifiche post-firma
    { "campo": "datiPrelievo.slumpMm", "da": "150", "a": "160", "data": "2026-06-28" }
  ]
  // acciaio: invece di "provini" → "saggi" (vedi SaggioAcciaio, dominio §2.4),
  // ogni saggio con diametro, nSpezzoni, lunghezzaMl, colata, identificativo.
}
```

## Lato K2 (produce)
- Compila i campi (form guidata, modello bot), prende il numero dal Cuore,
  acquisisce le firme (canvas), allega foto, SERIALIZZA il JSON secondo schema,
  lo deposita nella cartella di trasporto (OneDrive).
- Valida il JSON contro lo schema PRIMA di depositarlo (no JSON malformati).

## Lato Kerios (importa)
- Rileva il nuovo JSON (cartella verbali), VALIDA contro lo schema/versione,
  ricostruisce il verbale (corpo + firme) nel template → documento, collega al
  registro (riga numerata), aggiorna controlli/cruscotti.
- Import idempotente (chiave = numeroVerbale): un re-import non duplica.
- Se versione schema più vecchia: applica migrazione di lettura.

## Test del contratto (priorità in sviluppo)
- Round-trip: K2 produce un JSON → Kerios lo importa → il verbale ricostruito
  contiene ESATTAMENTE gli stessi dati. Test automatico in kerios-core.
- Un JSON di esempio per materiale (cls, acciaio) come fixture condivisa.
- Validazione schema: JSON malformati o senza versione vengono rifiutati con
  messaggio chiaro, mai importati a metà.

## Nota design K2
Il design di K2 (modello bot, vedi flussi-campo) va fatto bene, MA non deve mai
compromettere la fedeltà del JSON. Prima il contratto, poi l'estetica. Un bel
K2 che produce un JSON che Kerios non sa leggere è inutile.
