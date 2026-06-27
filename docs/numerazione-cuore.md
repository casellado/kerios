# Numerazione centrale — il "Cuore" di Kerios

> Risolve il problema dei progressivi univoci tra più operatori che lavorano in
> parallelo su opere diverse, senza vedersi e talvolta senza connessione al
> momento esatto del getto.

## Il problema

Più operatori generano verbali di prelievo nello stesso periodo, su opere diverse.
Ogni verbale richiede un **progressivo univoco**; ogni cubetto una sigla
(`numeroVerbale + A/B/C/D`) incisa fisicamente sul provino al getto, quindi il
numero deve esistere GIÀ in cantiere. Lo stesso per l'acciaio (numero verbale +
numero prelievo). Un contatore locale per-dispositivo collide. Serve un punto di
assegnazione **centrale e atomico**.

## Il principio NON NEGOZIABILE — minimizzazione del dato

Il Cuore custodisce **SOLO** progressivi. MAI dati aziendali.

```
IL CUORE CONOSCE:                  IL CUORE NON CONOSCE MAI:
- progressivo verbale CLS          - nome reale opera / committente
- sigle cubetti (A/B/C/D)          - parte d'opera, mix, Rck
- progressivo verbale ACCIAIO      - risultati prove (R1, R2, ...)
- progressivo prelievo acciaio     - firme, nominativi, logo
- codice OPACO opera (es. OPERA-7) - qualunque dato personale o di prova
```

La mappa `codice opaco → opera reale` vive SOLO dentro Kerios (lato utente).
Il Cuore incrementa "progressivi per OPERA-7" senza sapere cosa sia OPERA-7.
Se compromesso, espone solo numeri progressivi e codici opachi — valore ~nullo.

## Architettura: una famiglia di app, un cuore

Kerios NON è un'app sola: è una famiglia che condivide dominio, client-del-cuore
e persistenza. NON duplicare codice: base condivisa + due interfacce.

```
┌──────────────────────────┐      ┌──────────────────────────┐
│  KERIOS COMPLETO          │      │  VERBALE (app leggera)    │
│  desktop, uso del DL      │      │  mobile, per operatori    │
│  controlli, documenti,    │      │  SOLO flusso verbale:     │
│  quadro generale, registri│      │  scegli opera+materiale,  │
│  dati aziendali completi  │      │  prendi numero, compila,  │
│  mappa opaco→opera        │      │  firme (canvas), salva    │
└───────────┬──────────────┘      └────────────┬─────────────┘
            │                                   │
            │  HTTP (chiede progressivo)        │  HTTP (chiede progressivo)
            └─────────────┬─────────────────────┘
                          ▼
            ┌──────────────────────────────┐
            │  CUORE (VPS/serverless free)  │
            │  API minima, sempre acceso    │
            │  assegna progressivi atomici  │
            │  SOLO numeri + codici opachi  │
            └──────────────────────────────┘
```

- **Telegram NON è usato.** Le app chiamano il Cuore DIRETTAMENTE via HTTP.
- Il Cuore è una **piccola API**: essenzialmente un endpoint
  `POST /assegna { operaOpaca, materiale }` → `{ numeroVerbale, sigle[] }`.
- Il **completo** può stare spento; quando si apre, sincronizza i verbali.
- Il **leggero** è la STESSA web app (stesso stack/deploy statico), solo una
  vista mobile ridotta al flusso verbale. Non è un secondo progetto.

## Modello di assegnazione: K2 chiama il Cuore, Kerios importa

CHIARIMENTO (flusso reale del PO): l'unica comunicazione col Cuore è **K2 ↔ Cuore**.
- **K2** (app cantiere) chiama Cloudflare Workers e si fa assegnare il numero di
  verbale (+ sigle cubetti cls / numero prelievo acciaio). Il numero è univoco e
  bruciato (un'unica fonte → mai duplicati).
- **Kerios** NON chiama il Cuore per i numeri: **importa il JSON** prodotto da K2,
  che contiene GIÀ il numero definitivo. Kerios legge e basta.
- Autorità del progressivo: il Cuore (arbitro neutrale). K2 e Kerios non si
  parlano direttamente tra loro: si appoggiano entrambi al Cuore / al JSON.

### Scenario galleria / rete imperfetta (risolto a monte dal PO)
Nei cantieri la rete c'è, tranne in galleria. Prassi PO: **l'operatore chiede il
numero PRIMA di entrare** (dove c'è campo), poi compila il resto **offline**
(dati getto, foto DDT, firme) e sincronizza quando torna online.

### Numero e carichi rifiutati (decisione PO — semplice)
Lo slump-test e l'eventuale rifiuto del carico sono PRELIMINARI e avvengono FUORI
da K2 (vedi flusso-campo-cls.md). K2 si apre SOLO a carico accettato, quindi il
numero di verbale si chiede quando il carico è GIÀ buono. Non esiste il problema
del "numero sprecato per un rifiuto": K2 non sa nemmeno dei rifiuti. Nessuna
restituzione di numeri, nessun buco gestito a parte la normale sequenza.
→ L'unica operazione che richiede rete (prendere il numero) avviene quando la
rete c'è. Niente prenotazione di blocchi, niente numeri provvisori: caso semplice.
→ Idempotenza obbligatoria comunque (rete "imperfetta ma c'è"): se la risposta
tarda e l'operatore ritocca, K2 usa lo stesso id-richiesta e NON consuma due numeri.

## Flusso operativo

1. L'operatore apre **K2** (mobile). Sceglie opera (nome reale lato app; verso il
   Cuore viaggia il codice opaco) e materiale. PRIMA della galleria / dove c'è
   campo, prende il numero.
2. K2 chiama il Cuore → riceve numero verbale + sigle cubetti (cls) o numero
   prelievo (acciaio). Assegnazione **atomica** e **idempotente** (id-richiesta
   lato client: un retry per rete instabile NON consuma due numeri).
3. Offline: l'operatore incide le sigle sui provini, compila i dati, allega foto
   DDT/colata (se può) e raccoglie le **firme** (canvas). Tutto resta nel verbale,
   MAI sul Cuore.
4. K2 produce il **JSON** del verbale (numero già dentro) e lo deposita nella
   destinazione condivisa. Vedi "Sincronizzazione verbali" sotto.
5. Kerios **importa** il JSON: il verbale è lì, già numerato, pronto per Fase 2/3.
   Kerios non riassegna nulla.

## Sincronizzazione verbali (cantiere → Kerios) — VINCOLO IT: semi-manuale

> CONTESTO IT: l'IT aziendale del PO BLOCCA la condivisione via SharePoint verso
> gli operatori. Restano OK: web app nel browser, OneDrive personale del PO,
> chiamate HTTP in uscita verso servizi esterni. Architettura adattata.

**Flusso deciso (CTO + PO): semi-manuale, robusto, indipendente dall'IT.**
- L'app Verbale produce il JSON del verbale completo (dati aziendali + firme) e
  lo rende **scaricabile** dall'operatore.
- L'operatore lo prende dai propri Download e lo deposita nella **cartella
  `verbali` di Kerios** (cartella OneDrive del PO, agganciata via File System
  Access). La trasmissione operatore→PO usa il canale che già usano (NON SharePoint).
- Kerios, trovando un nuovo file nella cartella `verbali`, **in automatico**:
  1. lo **importa** nel registro (riga già numerata dal Cuore + dati + firme);
  2. lo **trasforma in verbale** ufficiale (templating su template .docx → PDF,
     testo selezionabile; vedi docs/verbali-template.md);
  3. **auto-collega** quel PDF come iperlink della cella "verbale" — il verbale
     nasce già linkato, senza drag&drop manuale.

**Rilevamento file nuovi**: Kerios scansiona la cartella `verbali` all'apertura
(e/o periodicamente). Serve un marcatore "già elaborato" (es. sposta in
sottocartella `_importati/` o registra l'hash) per NON re-importare due volte.

**Distinzione documenti collegati** (vedi M5):
- **VERBALE** → generato e auto-collegato da Kerios (NON serve drag&drop).
- **LETTERA** e **CERTIFICATO** → arrivano da fuori, restano collegati a mano
  (drag&drop o picker), come da M5.

**Principio di disaccoppiamento**: Kerios legge i verbali dalla SUA cartella
OneDrive; COME i file ci arrivano (a mano oggi; automatico domani se l'IT
approva un canale) è un dettaglio sostituibile che non tocca il registro. La
sincronizzazione automatica era un "di più", non il fondamento.

> Se in futuro l'IT approva un canale interno (cartella condivisa interna, Teams,
> casella dedicata), si sostituisce SOLO il trasporto, senza toccare il resto.

## Conteggi (assoluti e relativi)

Kerios completo, unendo progressivi (dal Cuore) + metadati (suoi), calcola quanti
verbali e cubetti in totale e per opera / WBS / parte / mix / Rck.

## Scelte tecniche (decise dal PO)

- Hosting del Cuore: **Cloudflare Workers + KV/D1 (free)**, mandato minimo (solo numeri +
  codici opachi). Volumi attesi (decine di verbali/settimana) → piano gratuito ok.
- **Compatibilità IT (importante)**: è il BROWSER di Kerios che chiama il Cuore
  (richiesta HTTP in USCITA), come una qualunque navigazione web. Per passare i
  filtri aziendali, il Cuore DEVE comunicare web-standard: **HTTPS su porta 443**,
  niente protocolli o porte esotiche, CORS corretto. Così il traffico è
  indistinguibile dal normale uso del web (verificato: la web app funziona in
  azienda). NON richiede all'IT di aprire nulla in ingresso.
- Assegnazione **atomica** (lock/transazione sul contatore) + **idempotenza**.
- Progressivi separati per codice opaco opera e per materiale (cls/acciaio).
- Nessun dato aziendale, nominativo, firma o di prova transita o è memorizzato
  sul Cuore. MAI.

## DA DEFINIRE col PO (milestone successiva)

- App **Verbale leggera**: layout mobile del verbale di prelievo, firme canvas
  (operatore + presenti), logo configurabile, personalizzazione operatore.
- Modello di verbale di prelievo: replicare un fac-simile esistente o disegnarlo.
- Trasporto del verbale completo verso il Kerios completo (vedi sopra).
- Autorizzazione operatore per opera: se/come limitare chi annuncia cosa.
- Formato preciso del progressivo cls e acciaio.

---

## Hosting del Cuore — scelta verificata (ricerca web 2026)

> Verificato davvero su fonti 2026 (il panorama "gratis" è cambiato: Heroku e
> Fly.io non hanno più free tier). Decisione fondata, non assunzione.

**SCELTA: Cloudflare Workers + KV/D1 (free tier).**
- 100.000 richieste/giorno gratis; storage KV globale + D1 (5 GB) inclusi.
- Modello edge: nessun cold start (a differenza di Render).
- Nessuna carta di credito; quota con taglio netto (no sorprese in bolletta).
- Limiti (10ms CPU/req, runtime V8 non-Node) IRRILEVANTI per un contatore:
  assegnare un progressivo atomico è un'operazione minima.
- Adatto al principio del Cuore: piccolo, solo numeri/codici opachi.

**Piano B: Deno Deploy** — 1M richieste/mese, 300k scritture / 450k letture KV.
Equivalente per un contatore; tenere come alternativa.

**SCARTATI (con motivo):**
- Render free: dorme dopo 15 min, cold start 30-50s → inaccettabile per un'API
  che assegna numeri in tempo reale.
- Vercel Hobby: VIETA l'uso commerciale. Kerios è strumento aziendale → NON usare.
- Railway: solo $5 di credito trial, poi a pagamento → non "gratis" reale.

Implementazione: Worker minimo con KV/D1 che tiene i contatori per
materiale/anno e restituisce progressivi atomici e idempotenti (vedi sopra).

## Formato delle sigle (DECISIONE PO + valutazione CTO)

### Acciaio
- **Numero verbale**: `AC1` + `/` + progressivo → `AC1/1`, `AC1/2`, ... `AC1/n`.
  - `AC1` = prefisso acciaio, FISSO. (CTO: implementare come default
    configurabile, di base "AC1", per coerenza col principio multi-commessa —
    il software avrà vita oltre il Megalotto. Per il PO resta AC1.)
- **Numero cartellino/saggio**: numero verbale + spazio + lettera →
  `AC1/1 A`, `AC1/1 B`, `AC1/1 C`, ... ; `AC1/2 A`, `AC1/2 B`, ...
  Le lettere distinguono i saggi dentro lo stesso verbale.

### Calcestruzzo
- **Numero verbale**: `CLS` + `/` + progressivo → `CLS/1`, `CLS/2`, ... `CLS/n`.
  Stessa identica logica dell'acciaio, cambia solo il prefisso (AC1 → CLS).
- **Numero cartellino/cubetto**: numero verbale + spazio + lettera, SEMPRE 4 →
  `CLS/1 A`, `CLS/1 B`, `CLS/1 C`, `CLS/1 D` ; `CLS/2 A`, ... (4 cubetti/verbale).
- `CLS` = prefisso calcestruzzo, FISSO (stesso trattamento di AC1: default
  configurabile per il principio multi-commessa).

### Separatore "/" — gestione (CTO)
Il "/" è ottimo per la VISUALIZZAZIONE (a schermo e sul verbale: `AC1/1`), ma è
VIETATO nei nomi di file (è separatore di cartella). Regola:
- **Display**: sempre con "/" → `AC1/1`, `AC1/1 A`.
- **Nome file** (PDF, scansione, JSON nella cartella): forma sicura automatica,
  es. `AC1-1` o `AC1_1` (mai "/"). L'utente vede sempre "/", il filesystem no.
- Il formato canonico nel JSON è la stringa display (`AC1/1`); la conversione a
  nome-file è una funzione di utilità (sanitize).

### Compatibilità storico
Formato NUOVO: `AC1/1` (slash, senza zeri). Lo STORICO era `AC1-0001` (trattino,
con zeri di riempimento). Il lettore di IMPORT deve riconoscere ENTRAMBI per non
perdere i ~35.000 verbali storici in archivio. Output nuovo sempre in formato
nuovo.

> Funzioni: formattaSiglaVerbale(prefisso, n), formattaSiglaCartellino(verbale,
> lettera), siglaToNomeFile(sigla) [sanitize "/"], parseSiglaImport(str)
> [riconosce AC1/1 e AC1-0001].
