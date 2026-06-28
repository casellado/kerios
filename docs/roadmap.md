# Roadmap Kerios

Strategia (decisa dal CTO): **fetta verticale sul calcestruzzo prima**. Si porta
il modulo CLS dall'import fino al documento, end-to-end, così il PO collauda
valore reale a ogni tappa. Poi si allarga ad acciaio e quadro generale.

Ogni milestone si chiude SOLO quando i suoi criteri di accettazione sono
verificabili dal PO. Le milestone con calcoli richiedono test `vitest` verdi.

---

## M0 — Scaffold e deploy
**Obiettivo**: progetto Vite+React+TS che builda e si pubblica su Cloudflare Pages
(codice su repo GitHub privato; Pages pubblica a ogni push).
- Setup Vite + React 18 + TS strict, ESLint, Prettier, Vitest.
- Struttura cartelle di `docs/architettura.md`.
- `reference/index.html` copiato nel repo.
- GitHub Actions: build + deploy su Pages.
- Home con le **tre porte** (Calcestruzzi / Acciaio / Quadro), navigabili.

**Accettazione PO**: collaudo PRIMA in locale (`npm run preview`): vedo Kerios
con le tre porte, ci clicco e navigo; Acciaio e Quadro mostrano "in costruzione".
Code predispone TUTTO il lato deploy (config, workflow Pages); l'attivazione
Cloudflare (account+repo) avviene subito dopo, per avere l'URL pubblico.
(Decisione CTO: non bloccare la verifica dello scaffold sul deploy pubblico.)

> NOTA SCALA (vedi docs/scala-e-persistenza.md): prevedere fin dallo scaffold lo
> strato di persistenza IndexedDB (es. via Dexie.js) e l'impostazione per la
> partizione per WBS. NON costruire un caricamento "tutto-in-memoria da CSV":
> i volumi reali sono ~65.000+ record.

---

## M1 — Engine NTC calcestruzzo + test (il cuore)
**Obiettivo**: `domain/cls.ts` completo e verificato. Nessuna UI nuova.
- `validitaPrelievo`, `resistenzaPrelievo`.
- `scartoQuadraticoMedio` (denominatore **n−1**).
- `controlloTipoA`, `controlloTipoB` con flag CV (0,15 avviso / 0,30 rifiuto).
- `suggerisciTipoControllo` (sceglie A/B da volume + n prelievi, con motivazione):
  il Tipo B è di uso reale per il PO, la selezione non va lasciata "a memoria".
- Test `vitest` con TUTTI i casi di `docs/dominio-ntc.md` (validità, A, B, selezione).

**Accettazione PO**: lancio `npm test`, tutti i casi normativi passano. Il PO
può aggiungere un caso noto e verificare che torni l'esito atteso.

---

## M2 — Import registro + tabella filtrabile
**Obiettivo**: caricare il CSV reale e lavorarci come nel prototipo.
- `io/csv.ts`: parsing `;`, encoding Windows-1252, virgola decimale, date gg/mm/aaaa.
- Mappatura 20 colonne del registro (vedi appendice).
- Tabella accessibile; filtri WBS, parte d'opera, Rck, mix; ricerca libera.
- Colonna "esito prelievo" calcolata (validità 20%).
- Import anche `.xlsx` via SheetJS (stesso schema colonne).

**Accettazione PO**: carico `Registro_CLS_ST11.csv`, vedo 22 prelievi, filtro
Rck=40 e mix `C40S4D25XA2`, restano solo quelli; i decimali sono con virgola.
Ogni riga mostra il **semaforo preliminare** (conforme/da verificare/fuori soglia,
testo+colore) e le **fasi temporali** (giorni di stagionatura, avvisi 28/45 gg).
Le soglie sono lette da `soglie.json` (modificabile senza toccare il codice).

---

## M3 — Selezione e generazione controllo (a schermo)
**Obiettivo**: i tre modi di raggruppare e l'esito NTC a schermo.
- Selezione multipla con barra riepilogo sticky.
- Selettore **modalità A / B / C** (vedi dominio-ntc.md §1.4-quater):
  - A auto-posizionale (terzine consecutive, genera tutto);
  - B assistito (propone terzine per mix + parte d'opera + vicinanza temporale);
  - C manuale (selezione libera con filtri).
- Tutte le modalità sfociano in una selezione EDITABILE (niente blocchi).
- Avvisi non bloccanti (mix non omogeneo, parti d'opera miste, >300 m³ se volumi
  presenti, >45 gg) con conferma flag `forzato`.
- Pannello risultato: Rcm28, Rcmin, **Rck effettiva**, s, CV, le due
  disuguaglianze NTC, esito. Tutti i calcoli da domain/cls.ts.

**Accettazione PO**: in modalità A genero le terzine del registro ST36 con un
click e ritrovo le Rck effettive dell'Excel (es. 54,57; 49,43...). In modalità C
seleziono a mano e, se mescolo mix diversi, ricevo un avviso che posso forzare.

---

## M4 — Cartella di lavoro + salvataggio progetto
**Obiettivo**: persistenza locale reale (richiede deploy https = Pages).
- `io/workspace.ts`: `showDirectoryPicker`, handle in IndexedDB, `ensurePermission`.
- `io/progetto.ts`: salva/carica `*.kerios.json` con scrittura atomica.
- Feature detection + fallback `<input type=file>` / download.
- Riapertura: al riavvio l'app ritrova la cartella e chiede 1 click per il permesso.

**Accettazione PO**: scelgo una cartella, genero un controllo, salvo, chiudo,
riapro l'app: ritrovo il mio progetto dopo un click di consenso. La copia in
cartella si sincronizza su OneDrive.

---

## M5 — Documenti collegati (verbali/lettere/certificati)
**Obiettivo**: i link ai PDF come da prototipo, senza vincoli di percorso.
- Drag & drop del PDF sulla cella + picker alternativo.
- Associazione `codice → handle` persistita.
- Click sulla cella apre il PDF.

**Accettazione PO**: trascino un certificato PDF sulla cella del certificato,
poi ci clicco e si apre. L'associazione sopravvive al salvataggio/riapertura.

> ESTENSIONE (vedi dominio-ntc.md §4): oltre a verbale/certificato, gestire come
> ALLEGATI con iperlink anche: DDT del cls (UNA per prelievo, anche fonte dati),
> documento di trasporto acciaio, e documenti di COLATA acciaio (PIÙ d'uno, legati
> ai singoli saggi). Allegabili dall'operatore (foto in app Cantiere) o dal DL
> dopo (desktop). Le LETTERE restano solo data+protocollo, NON file.

---

## M6 — Documenti ufficiali: controllo di accettazione + verbale di prelievo
**Obiettivo**: generare i due documenti ufficiali (sono COSE DIVERSE):
  (a) **Documento di controllo** (ST36): tabella riassuntiva del controllo.
  (b) **Verbale di prelievo**: dai template .docx aziendali (vedi sotto).

### (a) Documento di controllo di accettazione (ST36)
- Generazione fedele al modello ST36 del PO (vedi appendice B). Tecnologia:
  valutare templating o generazione tabellare; testo selezionabile, NON immagine.
- **Layout fedele al modello ST36** (vedi appendice B):
  - intestazione 3 righe: opera (S.S. 106 "Jonica") / descrizione lavori /
    elemento + pk (es. "TOMBINO SCATOLARE TO59  pk 7+624");
  - fasce di testata unite: PRELIEVO CAMPIONE / PARTE DI OPERA / LABORATORIO /
    RISULTATI DELLE PROVE / Controllo di accettazione "TIPO A";
  - colonne: Data, [Massa volumica], Rck, Verbale, Ubicazione, Denominazione,
    Certificato, Data Prova, Rott. a gg., R1, R2, R, Rmin, Rm, Rck effettiva;
  - blocchi Rmin/Rm/Rck effettiva uniti per terzina (come l'Excel);
  - blocco firma: "IL DIRETTORE LAVORI" + nome (configurabile).
- Massa volumica come colonna PRIMA di Rck, mostrata solo se valorizzata.
- **MAX 6 CONTROLLI PER SCHEDA ST36** (decisione PO+CTO): una singola scheda ST36
  contiene **al massimo 6 controlli**; oltre, si apre una **nuova scheda**. NON è
  un limite sul totale dei controlli di un'opera (che ne ha molti): è la
  **capienza del documento** → l'impaginazione va fatta a **gruppi di 6** (6 per
  pagina/scheda, poi la successiva). Si stampano **solo i controlli COMPLETI**
  (Tipo A/B con n al minimo): i controlli **APERTI** (incompleti, vedi
  dominio-ntc.md §1.4-quater-ter) **non** vanno nella scheda ST36.

### (b) Verbale di prelievo (templating su template .docx — SOLO DOCX)
> DECISIONE PO: Kerios genera SOLO il .docx; il PDF lo fa l'utente (Word) e lo
> ricollega in Kerios con iperlink alla riga del registro. Niente conversione
> docx→PDF client-side (era il rischio principale, ora disinnescato).
- Vedi docs/verbali-template.md. Si riempiono i template aziendali
  (reference/templates/): segnaposto `{modulo_codice}`, `{modulo_versione}`,
  `{%logo_aziendale}`, `{corpo_html}` → docx compilato → PDF.
- Il `{corpo_html}` contiene dati prelievo + tabella cubetti/saggi + firme (img).
- Stesso motore per cls e acciaio (cambia solo il template/titolo).
- Esporta nella cartella di lavoro + download; il verbale si auto-collega
  (iperlink) alla riga del registro.

**Accettazione PO**: (a) genero il documento di controllo ST36 e coincide con
l'Excel originale (intestazione, colonne, Rck effettive, firma DL), testo
selezionabile; (b) genero un verbale di prelievo dal template aziendale e
ritrovo cornice, codice/versione modulo, logo, dati e firme al posto giusto.

---

## M7 — Modulo Acciaio (tondino + rete)
**Obiettivo**: replicare il flusso per l'acciaio (§ 11.3.2), tondino e rete.
- `domain/acciaio.ts` + test: verifica per saggio (fy, Agt, ft/fy, piega, e
  distacco nodo per la rete) vs Tab. 11.3.VI; soglie dal JSON acciaio.
- Distinzione `tipoProdotto` barra/rete e `tipoAcciaio` B450C/B450A.
- Import del registro acciaio reale (encoding Windows-1252, ';', header
  multi-livello: ogni parametro su 3 colonne = 3 saggi). Mappatura in appendice C.
- Controllo = 3 saggi/3 diametri per lotto (30 t); ciclo di vita 3 fasi come cls.
- Documento PDF fedele al modello ST36 AC1 (dominio-ntc.md §2.5).
- **Scala**: il registro acciaio reale ha ~6.000 verbali / ~22.000 righe e decine
  di WBS → si applica l'architettura di scala (IndexedDB, partizione per WBS,
  virtualizzazione). Vedi docs/scala-e-persistenza.md.

**Accettazione PO**: importo il registro acciaio reale, filtro una WBS, vedo i
saggi coi loro esiti per parametro; genero un controllo conforme/non conforme e
il PDF nel formato ST36 AC1; l'app resta fluida nonostante i volumi.

> NOTA M7: i valori di accettazione per singolo saggio in cantiere sono CONFERMATI
> e nel JSON (B450C: 425≤fy≤572, Agt≥6%, 1,13≤ft/fy≤1,37, piega; B450A: Agt≥2%,
> ft/fy≥1,03). Tipo del PO = B450C. Suffisso diametro = campo libero. Resta da
> trascrivere (solo se servirà il caratteristico su n prove) k(n) da Tab.11.3.IV/V.
> Per il controllo di routine NON serve: bastano i valori saggio confermati.

---

## M8 — Quadro generale (proiezione)
**Obiettivo**: vista aggregata automatica per WBS/opera, CLS + acciaio insieme.
- Funzione pura di proiezione dai controlli salvati.
- Stato completezza/conformità per opera → parte d'opera.
- Normalizzazione/coerenza dei nomi opera tra i due registri (con il PO).

**Accettazione PO**: apro il Quadro, vedo per ST11 lo stato dei controlli cls e
acciaio raggruppati per parte d'opera, con conformità a colpo d'occhio.

---

## M9 — Inserimento e modifica diretta (Kerios come sistema di registrazione)
**Obiettivo**: compilare in Kerios senza partire dall'Excel. Chiude il cerchio
del modello "sistema di registrazione" (CLAUDE.md §3-bis, dominio-ntc.md §1.0).
- Form di inserimento prelievo per **fasi**:
  - Fase 1 (verbale): data, wbs, parte, rck, mix, verbale, [massa vol., volume];
  - Fase 2 (trasmesso): aggiunta lettera/protocolli quando si invia al laboratorio;
  - Fase 3 (refertato): aggiunta certificato, data prova, r1, r2.
- Validazione in inserimento: ricalcolo R medio, avviso prelievo nullo (>20%),
  date coerenti, campi obbligatori per fase.
- **Second brain** (vedi docs/second-brain.md): niente anagrafiche da caricare;
  i valori (opera/parte/laboratorio/mix/impianto) si auto-popolano dall'uso.
  Suggerimenti al focus, ordinati per recenza, liste corte, highlighting
  invertito, pre-compilazione delle combinazioni ricorrenti (es. opera→mix
  abituale) sempre come proposta modificabile. Combobox ARIA accessibile.
- Viste operative per stato: "in attesa di certificato", avviso 45 giorni.
- Modifica/eliminazione prelievo. CSV/XLSX restano come import/export.

**Accettazione PO**: su un cantiere nuovo, senza alcun Excel, inserisco un
verbale oggi (solo Fase 1), domani trascrivo la lettera, poi il certificato; il
prelievo avanza di stato e quando è refertato entra nei controlli. Le tendine mi
evitano di riscrivere opera e laboratorio.

> NOTA SEQUENZA: M9 è in coda per ordine di COSTRUZIONE, ma il suo modello dati
> (campi opzionali per fase, stato derivato) va previsto fin da M1. Code non deve
> incastrarsi modellando prima il prelievo come riga statica.

---

## M10 — Il Cuore: numerazione centrale (vedi docs/numerazione-cuore.md)
**Obiettivo**: servizio centrale che assegna progressivi univoci, atomico.
- API minima su VPS/serverless gratuito: `POST /assegna {operaOpaca, materiale}`
  → `{numeroVerbale, sigle[]}` (cls) o `{numeroVerbale, numeroPrelievo}` (acciaio).
- Contatore **atomico** (transazione/lock) e **idempotente** (id-richiesta).
- Custodisce SOLO progressivi + codici opachi opera. ZERO dati aziendali.
- Client lato Kerios (`io/cuore.ts`) che chiama l'API; mappa opaco↔opera SOLO
  lato Kerios. Gestione offline/retry.

**Accettazione PO**: due richieste concorrenti ricevono numeri diversi; un retry
non consuma due numeri; sul servizio non compare alcun dato aziendale.

---

## M11 — App Cantiere separata (per operatori) + import in Kerios
**Obiettivo**: app a sé per gli operatori, modello dati/JSON CONDIVISO con Kerios.
- **Progetto separato** (suo deploy, suo ciclo di vita) MA che importa i tipi di
  dominio e lo schema JSON del verbale da un pacchetto condiviso → il formato non
  può divergere tra chi scrive (cantiere) e chi legge (Kerios). Single source of
  truth del formato.
- Vista mobile minima: scegli opera+materiale → chiama il Cuore (progressivo) →
  compila verbale → firme canvas (operatore + presenti) → logo → salva.
- Output: **file JSON** del verbale (schema condiviso), scaricato dall'operatore.
- Cruscotto operatore: solo gli ultimi 5-10 verbali propri (nessun problema scala).
- Funziona offline/galleria; trasporto a Kerios via cartella OneDrive (M5/cuore):
  l'operatore deposita il JSON, Kerios lo importa, genera PDF e auto-collega.

**Accettazione PO**: l'operatore usa la SUA app, crea un verbale numerato e
firmato, esce un JSON; lo metto nella cartella e Kerios lo importa senza attriti,
perché lo schema è lo stesso. Aggiornare l'app cantiere non tocca Kerios desktop.

> Pacchetto condiviso (es. `kerios-core`): tipi di dominio + schema/validazione
> JSON verbale + client del Cuore. Usato sia da Kerios sia dall'app Cantiere.

### MONOREPO — K2 e Kerios in UN solo repository (decisione PO+CTO)
A M11 K2 (app Cantiere) e Kerios passano in un **monorepo** con **npm
workspaces**. K2 resta un **progetto separato** (suo deploy, suo ciclo di vita) ma
**condivide `kerios-core`** (tipi di dominio + schema/validazione JSON del verbale
+ client del Cuore) dentro lo stesso repo. Principio: *"i pacchetti che cambiano
insieme vivono insieme"* — un **singolo commit** allinea entrambe le app e il
**contratto non può divergere** (chi scrive in cantiere e chi legge in ufficio
usano lo stesso identico schema, atomicamente).

Struttura del monorepo:
```
packages/
  kerios-core/        tipi dominio + schema JSON verbale + client Cuore (condiviso)
apps/
  kerios-app/         Kerios desktop (questo progetto)
  k2/                 app Cantiere (operatori)
```
`src/core/` di questo progetto è **isolato dall'inizio** (M1, confine ESLint
ui→domain→io) PROPRIO per estrarsi qui senza attriti: a M11 diventa
`packages/kerios-core` e le due app lo importano. Fino ad allora resta in
`src/core/` (nessun costo anticipato di tooling monorepo).

---

## M12 — I tre cruscotti (calcestruzzo, acciaio, combinato)
**Obiettivo**: i cruscotti completi richiesti dal PO. Vedi docs/cruscotti.md.
- Tre cruscotti distinti con la stessa gerarchia a 3 priorità (P1 conformità &
  completezza, P2 qualità tecnica, P3 operativo).
- **Cruscotto cls**: conformità controlli, margini Rck, dispersione, slump,
  trasporto, massa volumica, prelievi in attesa, indice qualità cls.
- **Cruscotto acciaio**: % saggi conformi per parametro (fy/Agt/ft/fy/piega),
  conformità per produttore/colata, copertura lotti 30 t, riserve, indice qualità.
- **Cruscotto combinato**: vista per opera che FONDE cls+acciaio (semaforo opera,
  qualità complessiva, completezza su entrambi i fronti).
- Funzioni pure in domain/, calcolo su indici di sintesi per WBS (scala),
  grafici accessibili (valore testuale oltre al colore). VIETATO "durabilità".

**Accettazione PO**: apro ciascun cruscotto e vedo, nell'ordine, conformità →
qualità → cosa manca; il combinato mi dice per ogni opera se è a posto su
ENTRAMBI i materiali. Tutto su dati misurati, nessuna previsione.

---

## Appendice — mappatura colonne registro CLS

| idx | intestazione CSV                         | campo            | note                    |
|----:|------------------------------------------|------------------|-------------------------|
| 0   | VERBALE DL                               | verbale          | id prelievo + link doc  |
| 1   | DATA VERBALE DL                          | dataVerbale      | gg/mm/aaaa              |
| 2   | WBS                                      | wbs              | aggregatore (trim!)     |
| 3   | DESCRIZIONE E PARTE D'OPERA VERBALE DL   | parte            | filtro + descrizione    |
| 4   | DDT                                      | ddt              |                         |
| 5   | IMPIANTO                                 | impianto         | fornitore               |
| 6   | MIX - SOTTOMISSIONE                      | mix              | miscela omogenea        |
| 7   | PROTOCOLLO RICHIESTA D.L.                | lettera          | link lettera            |
| 8   | DATA                                     | dataRichiesta    |                         |
| 9   | PROTOCOLLO RICEZIONE D.L.                | protRicezione    |                         |
| 10  | DATA                                     | dataRicezione    |                         |
| 11  | NUMERO CERTIFICATO                       | certificato      | link certificato        |
| 12  | DATA CERTIFICATO                         | dataCertificato  |                         |
| 13  | LABORATORIO                              | laboratorio      |                         |
| 14  | DATA PROVA                               | dataProva        |                         |
| 15  | Rck                                      | rck              | filtro + calcolo        |
| 16  | R1 [N/mmq]                               | r1               | virgola decimale        |
| 17  | R2 [N/mmq]                               | r2               | virgola decimale        |
| 18  | R medio                                  | rmedioCsv        | ricalcolare da r1,r2    |
| 19  | NOTE                                     | note             |                         |

> Attenzione: i valori WBS nel CSV hanno spazi finali ("ST11 ") → trimmare.

## Appendice B — struttura documento di output (modello ST36)

Dall'Excel `ST36_Controllo_accettazione_cls.xlsx` (foglio unico, A1:O30).

**Intestazione**
- A1: opera — es. `S.S. n. 106 "Jonica"`
- A2: descrizione lavori (riga lunga)
- A3 + E3: elemento + pk — es. `TOMBINO SCATOLARE TO59` · `pk 7+624`

**Fasce di testata (celle unite)**
- `PRELIEVO CAMPIONE` (Data, Rck, Verbale)
- `PARTE DI OPERA` (Ubicazione, Denominazione)
- `LABORATORIO` (Certificato)
- `RISULTATI DELLE PROVE` (Data Prova, Rott. a gg., R1, R2, R)
- `Controllo di accettazione "TIPO A"` (Rmin, Rm, Rck effettiva)

**Colonne riga dati**
`Data | Rck | Verbale | Ubicazione | Denominazione | Laboratorio | Certificato |
Data Prova | Rott. a gg. | R1 | R2 | R | Rmin | Rm | Rck effettiva`
(con Kerios: inserire `Massa volumica` opzionale tra Data e Rck.)

**Formule per terzina** (blocco di 3 righe, celle Rmin/Rm/Rck eff. unite):
- `R     = (R1 + R2) / 2`              (per ogni riga)
- `Rott. a gg. = Data Prova − Data`     (giorni di maturazione)
- `Rmin  = MIN(R della terzina)`
- `Rm    = AVERAGE(R della terzina)`
- `Rck effettiva = MIN(Rmin + 3,5 ; Rm − 3,5)`

**Piè di pagina**: `IL DIRETTORE LAVORI` + nome (configurabile, es. `Ing. ...`).

> Nota: nel modello attuale tutte le righe sono Rck=40 e Tipo A. Kerios deve
> reggere anche Rck e Tipo diversi senza assumere il caso singolo.

## Appendice C — mappatura colonne registro ACCIAIO (reale)

Da `Registro_Prelievi_AC1` (header multi-livello; ogni parametro su 3 colonne =
3 saggi del controllo). Encoding Windows-1252, separatore ';'.

| idx   | intestazione              | campo                | note                       |
|------:|---------------------------|----------------------|----------------------------|
| 0     | ISPETTORE                 | ispettore            |                            |
| 1     | WBS                       | wbs                  | aggregatore (trim)         |
| 2     | Verbale n.                | verbale              | es. "AC1-0001"             |
| 3     | Data prelievo             | data                 | gg/mm/aa                   |
| 4     | D.D.T.                    | ddt                  |                            |
| 5     | PARTE D'OPERA             | parte                | ubicazione + pk            |
| 6     | Produttore                | produttore           | marchio (es. FERRIERE NORD)|
| 7     | Ø mm                      | diametro             | "12","16","Ø6-10x10"(rete) |
| 8     | Colata                    | colata               |                            |
| 9-10  | Prot. Rich. D.L. / Data   | lettera / dataRich.  | fase 2                     |
| 11-12 | Prot. Ricezione / Data    | protRic / dataRic    | fase 2                     |
| 13    | Laboratorio               | laboratorio          |                            |
| 14    | Data Prova                | dataProva            | fase 3                     |
| 15-16 | Certificato / Data        | certificato / data   | fase 3                     |
| 17-19 | fy [N/mm2]                | fy saggi 1,2,3       | 3 colonne (3 saggi)        |
| 20-22 | Agt [%]                   | agt saggi 1,2,3      | 3 colonne                  |
| 23-25 | ft/fy                     | ftfy saggi 1,2,3     | 3 colonne                  |
| 26-28 | NOTE                      | note                 |                            |
| 29-36 | Controllo di Accettazione | esiti                | Positivo/Negativo          |
| 37+   | Esito piega               | piega                | Positivo/Negativo          |

> Una RIGA del registro = un saggio (un diametro). Più righe con lo stesso
> "Verbale n." compongono il controllo (tipicamente 3 saggi/3 diametri). Da
> CONFERMARE col PO come legare righe→controllo e i suffissi R/B/A del diametro.

## M13 — Lavagna dei getti (coordinamento ispettori)
**Obiettivo**: semaforo WBS condiviso (vedi docs/lavagna-getti.md).
- Vista coordinatore: crea/aggiorna righe WBS opaca + giorno/ora del getto.
- Vista ispettore (mobile): lista rosso/verde, tocca per prenotare (sigla
  opzionale), sblocco verde→rosso possibile.
- Stato condiviso in tempo reale su Cloudflare (KV/D1 + Durable Objects),
  arbitraggio atomico delle prenotazioni (no doppioni). Modulo SEPARATO dal Cuore.
- Solo dati minimi sul server (wbsOpaca, data/ora, stato, sigla?). Mai dati
  aziendali. Stato testuale oltre al colore (accessibilità).

**Accettazione PO**: il coordinatore carica le WBS del giorno; da due telefoni
diversi vedo lo stesso elenco; tocco una WBS rossa e diventa verde su entrambi
subito; se due prendono insieme, uno solo vince. Sul server non ci sono dati
aziendali, solo stati.
