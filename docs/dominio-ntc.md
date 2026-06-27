# Dominio NTC 2018 — Specifica di calcolo per l'engine

> Fonte: D.M. 17/01/2018 (NTC 2018) Cap. 11; Circolare n. 7 del 21/01/2019.
> Questo documento è la specifica autorevole per `domain/`. Le formule vanno
> implementate ESATTAMENTE come qui descritte. Ogni funzione ha test associati.

---

## 1. CALCESTRUZZO (§ 11.2.4 – 11.2.5)

### 1.0 Ciclo di vita del prelievo (MODELLO FONDAMENTALE)

Kerios è **sistema di registrazione**, non solo lettore di Excel. Un prelievo
NON nasce completo: si arricchisce in 3 fasi nel tempo. Il modello dati deve
reggere questo dalla M1, anche se il form di inserimento arriva alla M9.

```
Fase 1 — VERBALE      (trascrizione giornaliera dei verbali di prelievo)
  campi: data, wbs, parte, rck, mix, verbale, [massaVolumica?], [volumeGetto?]
  → R1/R2/certificato NON esistono ancora (cubetto appena confezionato)

Fase 2 — TRASMESSO    (invio lettera di trasmissione al laboratorio)
  + campi: lettera (protocollo richiesta), dataRichiesta, [protRicezione, dataRicezione]

Fase 3 — REFERTATO    (ricezione certificato dal laboratorio)
  + campi: certificato, dataCertificato, laboratorio, dataProva, r1, r2
  → solo ORA il prelievo è CALCOLABILE ed entra nei controlli
```

**Stato derivato** (non un campo da digitare, si deduce dai campi presenti):
```ts
type StatoPrelievo = 'verbale' | 'trasmesso' | 'refertato';
function statoPrelievo(p: Prelievo): StatoPrelievo;
// 'refertato' richiede r1 && r2 && certificato
```

**Conseguenze (vincolanti):**
- I campi di Fase 2/3 sono OPZIONALI nel tipo `Prelievo` (vedi §3).
- Un prelievo NON refertato non entra nei controlli di accettazione né nei calcoli.
- Lo stato abilita viste/avvisi operativi:
  - "prelievi in attesa di certificato" (stato ≠ refertato);
  - avviso 45 giorni: se `oggi − data > 45` e non refertato → segnala
    (rischio di dover integrare con prove in opera, §1.6);
  - filtro "solo refertati" per costruire i controlli.
- L'import CSV/XLSX dei cantieri storici crea prelievi già in stato 'refertato'.
  L'inserimento manuale (M9) parte da Fase 1 e avanza.

### 1.1 Definizioni

- **Provino**: singolo cubo/cilindro. Resistenza a compressione in N/mm².
- **Prelievo**: 2 provini dallo stesso impasto, prelevati alla posa.
- **Resistenza di prelievo `Rc`**: media delle resistenze dei 2 provini del prelievo.

> LEGAME 4 CUBETTI ↔ 2 RESISTENZE (prassi PO, confermato): al getto si
> confezionano **4 cubetti** (A, B, C, D, incisi nel verbale). **2 vengono
> provati a 28 giorni** → forniscono R1 e R2 (le due resistenze del prelievo);
> **2 restano di riserva** (per eventuali controprove). Quindi: il VERBALE
> documenta 4 cubetti fisici; il CONTROLLO usa le 2 resistenze dei 2 provati.
> Modello dati: i provini A–D esistono come oggetti; R1/R2 sono i risultati dei 2
> effettivamente provati (campi fase 3, opzionali finché non refertati). Quali 2
> siano provati e quali 2 di riserva può non essere noto alla compilazione: si
> registra alla refertazione.
  È il valore con cui si fanno i controlli.
- **Miscela omogenea**: stessa classe di resistenza, esposizione, consistenza.
  Un controllo si riferisce a UNA miscela omogenea.
- **`Rck`**: resistenza caratteristica cubica di progetto (N/mm²).

### 1.2 Validità del prelievo (§ 11.2.4) — `validitaPrelievo`

Dati R1, R2 (le due resistenze dei provini):
```
Rmin = min(R1, R2)
Rmax = max(R1, R2)
scarto% = (Rmax - Rmin) / Rmin * 100
valido  = scarto% <= 20
```
> Il prelievo NON è accettato se `|R1 - R2| > 20% di Rmin`.
> Un prelievo non valido è "nullo" e NON deve entrare nei controlli.
> La UI lo segnala (testo + colore), l'engine lo esclude o avvisa.

**Casi test** (da `Registro_CLS_ST11`):
- R1=24, R2=23,3 → scarto 3,00% → valido
- R1=56,5, R2=49 → scarto 15,31% → valido (limite alto reale del dataset)
- (sintetico) R1=50, R2=40 → scarto 25,00% → NULLO

### 1.3 Controllo TIPO A (§ 11.2.5.1) — `controlloTipoA`

Campo di applicazione: miscela omogenea da **≤ 1500 m³**.
Frequenza: ≥ 1 prelievo / 100 m³ di getto; **minimo 3 prelievi**.
(< 100 m³: comunque min 3 prelievi, deroga dal prelievo giornaliero.)

Numero di prelievi: **3 ≤ n < 15**.

```
n     = numero prelievi
Rcm28 = media delle n resistenze di prelievo Rc
Rcmin = min delle n resistenze di prelievo Rc

Disuguaglianza 1:  Rcm28 ≥ Rck + 3,5      (N/mm²)
Disuguaglianza 2:  Rcmin ≥ Rck − 3,5      (N/mm²)

conforme = Disug.1 AND Disug.2
```

**Caso test** (sintetico, Rck=30, n=3, Rc = {37, 35, 36}):
- Rcm28 = 36,00 ; Rcmin = 35,00
- Disug.1: 36,00 ≥ 33,5 → OK
- Disug.2: 35,00 ≥ 26,5 → OK → CONFORME

### 1.4 Controllo TIPO B (§ 11.2.5.2) — `controlloTipoB`

Campo di applicazione: miscela omogenea da **> 1500 m³**. OBBLIGATORIO.
Frequenza: ≥ 1 controllo / 1500 m³. Numero di prelievi: **n ≥ 15**.

```
n     = numero prelievi (≥ 15)
Rcm28 = media delle n resistenze di prelievo
Rcmin = min delle n resistenze di prelievo
s     = scarto quadratico medio CAMPIONARIO  (denominatore n−1)
        s = sqrt( Σ(Rc_i − Rcm28)² / (n − 1) )      ← ATTENZIONE: n−1, non n
CV    = s / Rcm28      (coefficiente di variazione)

Disuguaglianza 1:  Rcm28 ≥ Rck + 1,48 · s   (N/mm²)
Disuguaglianza 2:  Rcmin ≥ Rck − 3,5        (N/mm²)

conforme = Disug.1 AND Disug.2
```

**Vincoli sulla dispersione (§ 11.2.5.2):**
- `CV > 0,30` → calcestruzzo **NON accettabile** (rifiuto a prescindere).
- `CV > 0,15` → servono **controlli più accurati** integrati con prove
  complementari. L'engine restituisce un flag di AVVISO (non blocca, segnala).

> NOTA CRITICA (Circolare 2019, punto C11.10.1.1.1.1; Eurocodice EN 1990 Annex D):
> `s` si calcola con denominatore **n−1** (equivalente a `DEV.ST.C` di Excel,
> ovvero deviazione standard campionaria). NON usare la deviazione di
> popolazione (denominatore n).

**Caso test** (n=15, Rck=40):
- s = 9 N/mm² ; valore di conformità Disug.1: Rck + 1,48·s = 40 + 1,48·9 = 53,3
- Rcm,15 (media) = 53,1 ; Rcmin,15 (minimo) = 50,4
  (NB: il minimo è ≤ media, per costruzione)
- Disug.1: Rcm ≥ Rck + 1,48·s → 53,1 ≥ 53,3 → NO (manca per un soffio)
- Disug.2: Rcmin ≥ Rck − 3,5 → 50,4 ≥ 36,5 → OK
- Una disug. non verificata → NON CONFORME
> NOTA (correzione PO/CTO): in una versione precedente media e minimo erano
> trascritti scambiati (minimo 53,1 > media 50,4, impossibile). Valori corretti
> sopra. Prima di encodare il test definitivo in M1, il PO conferma i numeri
> esatti dell'esempio di riferimento; la struttura logica del controllo resta
> questa.

### 1.4-bis Rck effettiva (output OBBLIGATORIO del Tipo A)

Il documento del PO mostra una colonna "Rck effettiva" calcolata come:
```
Rck_eff = MIN( Rmin + 3,5 ; Rm − 3,5 )      [= MIN(M+3.5, N-3.5) nell'Excel]
```
È la massima Rck che il gruppo può certificare. Interpretazione:
```
conforme  ⟺  Rck_eff ≥ Rck_progetto
```
Equivale esattamente alle due disuguaglianze del Tipo A (riarrangiate). L'engine
DEVE restituire `rckEffettiva` in `RisultatoControllo`, ed è il valore mostrato
nel documento. Verificato sull'Excel ST36 (es. gruppo righe 7-9: Rck_eff=54,57).

### 1.4-ter Campi opzionali (avvisi non bloccanti)

**Massa volumica** (`massaVolumica?: number`, kg/m³) — UNI EN 12390-7. Già
misurata dal laboratorio e riportata nei certificati. NON è una verifica di
accettazione per il cls ordinario (lo è solo per i leggeri). Funzione diagnostica
separata dall'engine NTC:
```
plausibilitaMassaVolumica(mv):  avviso se mv < 2200 o mv > 2500 (kg/m³)
```
Colonna PRIMA di Rck (sia registro sia documento). Vuoto = nessun calcolo, nessun
avviso. Non entra MAI nelle disuguaglianze A/B.

**Volume di getto** (`volumeGetto?: number`, m³) — opzionale. Quando presente,
abilita l'avviso "Tipo A: superato il limite di 300 m³" se la somma dei volumi
del gruppo supera 300. Vuoto = avviso non emesso (nessun blocco).

### 1.4-quinquies Consistenza (slump) e tempi di trasporto — dati del verbale

Questi nascono al GETTO (Fase 1 del ciclo di vita), sul verbale di prelievo.
Diagnostici: NON entrano nelle disuguaglianze NTC della resistenza.

**Slump** (`slump?: number`, mm) — campo atteso del verbale (prassi di
accettazione: il DL controlla la consistenza prescritta, UNI EN 206). Confronto
automatico con la classe estratta dal mix design:
```
Classi UNI EN 206 (mm):  S1 10–40 | S2 50–90 | S3 100–150 | S4 160–210 | S5 ≥220
classe = estrai "S1..S5" dalla sigla mix (es. "...S4..." → S4)
avviso se slump fuori dall'intervallo della classe estratta.
```
Se la sigla mix non contiene un marcatore S1..S5 riconoscibile: classe = ignota,
NESSUN confronto (registra solo il valore). Degrada con grazia, niente errori.

**Tempi di trasporto** — tre orari sul verbale:
```
oraPartenza?  (autobetoniera)   oraArrivo?   oraScarico?
tempoTrasporto = oraScarico − oraPartenza   (minuti)
avviso se tempoTrasporto > 90 minuti  (soglia standard, lavorabilità/presa)
```
Soglia 90 min fissa di default. Calcolo solo se oraPartenza e oraScarico presenti.

### 1.4-sexies Fasi temporali del cubetto (tracciamento)

Affinamento del ciclo di vita (§1.0) con le DATE, per leggere la linea di vita:
```
prelievo (data verbale) ──► inviato al laboratorio (dataRichiesta) ──►
schiacciamento (dataProva)
```
Intervalli calcolati e mostrati:
- giorni prelievo→invio;
- giorni di **stagionatura** = dataProva − dataPrelievo:
  - canonico 28 gg; ammesso entro 45 gg (§1.6);
  - avviso se < 28 (prova anticipata) o > 45 (oltre il limite di legge → carotaggi);
- Kerios mostra dove sta ogni cubetto nella linea di vita (stato + giorni).

### 1.4-septies Controllo minimale sul singolo prelievo (semaforo PRELIMINARE)

Appena inseriti R1/R2, Kerios dà un esito **preliminare** sul singolo prelievo,
PRIMA del controllo di accettazione di gruppo. NON è un verdetto NTC (la
conformità si decide solo sul gruppo Tipo A/B): è un indicatore di qualità.

Tre stati, comunicati con TESTO + COLORE (mai solo colore):
```
CONFORME       (verde)  — prelievo valido (scarto ≤20%) e Rc ≥ Rck
DA VERIFICARE  (giallo) — valido ma Rc sotto Rck di poco / parametri al limite
FUORI SOGLIA   (rosso)  — prelievo nullo (scarto >20%) o Rc nettamente < Rck
```
Etichetta sempre esplicita: "indicazione preliminare, non controllo di
accettazione". Le soglie vengono dal JSON (sotto).

### 1.4-octies JSON delle soglie (configurazione esterna delle regole)

Le soglie normative/diagnostiche NON sono hardcoded: vivono in un file JSON che
Kerios legge. Cambiare una soglia = modificare il JSON, non il codice.
```jsonc
// soglie.json (esempio)
{
  "validitaPrelievo": { "scartoMaxPct": 20 },
  "tipoA": { "deltaRcm": 3.5, "deltaRcmin": 3.5 },
  "tipoB": { "fattoreS": 1.48, "deltaRcmin": 3.5, "cvAvviso": 0.15, "cvRifiuto": 0.30 },
  "massaVolumica": { "min": 2200, "max": 2500 },
  "volumeTipoA": { "maxM3": 300 },
  "trasporto": { "maxMinuti": 90 },
  "stagionatura": { "canonicoGg": 28, "limiteGg": 45 },
  "slumpClassi": {
    "S1": [10,40], "S2": [50,90], "S3": [100,150], "S4": [160,210], "S5": [220,999]
  },
  "acciaio": {
    "_FONTE": "NTC 2018 controllo accettazione cantiere singolo saggio. Confermati da laboratorio ufficiale (Lab. Trentino) e materiale univ. (UniCT). fy_max=450*(1.25+0.02)=572.",
    "saggio_cantiere": {
      "B450C": { "fyMin": 425, "fyMax": 572, "agtMin": 6.0, "ftfyMin": 1.13, "ftfyMax": 1.37, "piega": "assenza_cricche" },
      "B450A": { "fyMin": 425, "fyMax": 572, "agtMin": 2.0, "ftfyMin": 1.03, "piega": "assenza_cricche" }
    },
    "_NOTA_caratteristico": "Per il valore caratteristico su n prove (casi specifici, es. progettista con k>1.15) serve k(n) da Tab.11.3.IV/V — da trascrivere dal testo ufficiale se/quando servirà. Per il controllo di routine bastano i valori saggio_cantiere.",
    "fyNom": 450, "ftNom": 540,
    "plausibilita": { "fy": [400,650], "agt": [1,30], "ftfy": [1.0,1.5] },
    "lottoTonnellate": 30,
    "saggiPerControllo": 3
  }
}
```
> I valori NTC (deltaRcm 3.5, fattoreS 1.48, ecc.) restano quelli di legge; il
> JSON serve a non duplicarli nel codice e ad adattare i diagnostici, NON a
> indebolire le verifiche normative.

### 1.4-novies Indice di qualità dell'opera (cruscotto, NON predizione)

Per opera/WBS, un punteggio composito sui FATTI MISURATI. NON è "durabilità
presunta" né una previsione: è una sintesi dei dati raccolti, difendibile.
Segnali aggregati:
```
- % prelievi conformi
- margine medio sulle Rck effettive (quanto sopra soglia, non solo se sopra)
- dispersione dei risultati (CV / scarto tipo dei Rc)
- % slump in classe
- % tempi di trasporto entro soglia
→ indice sintetico + grafico per opera (alta / media / da attenzionare)
```
VIETATO etichettarlo come "durabilità", "vita utile", "anni": sarebbe una
previsione non difendibile e una responsabilità per il DL. Solo "qualità del
calcestruzzo messo in opera, su dati misurati".

### 1.4-quater Modalità di raggruppamento (3 strategie, 1 motore)

Le strategie producono SOLO una proposta di insiemi di prelievi; il motore NTC è
ignaro della strategia. Ogni proposta resta editabile dall'utente.

- **A — auto-posizionale**: terzine consecutive nell'ordine del registro
  (replica il metodo Excel attuale). Genera tutti i controlli in un'azione.
- **B — assistito-omogeneo**: propone terzine raggruppando per
  `mix` (miscela) + `parte d'opera` + **vicinanza temporale** (prelievi vicini
  per data). L'utente conferma/ritocca.
- **C — manuale**: selezione libera con filtri; engine calcola e avvisa.

**Avvisi (mai bloccanti)** — quando un gruppo viola un vincolo, l'engine/strategia
emette un avviso; l'utente può confermare con flag `forzato: true` che viene
tracciato sul controllo (e annotato nel documento/quadro). Casi:
- miscele diverse nello stesso controllo (mix non omogeneo);
- parti d'opera eterogenee nella terzina;
- volume cumulato > 300 m³ (solo se i volumi sono presenti);
- prove oltre 45 gg dal getto (se le date lo permettono).

```ts
export type ModoRaggruppamento = 'auto' | 'assistito' | 'manuale';
export interface ProtostaControllo {   // proposta editabile
  prelieviIds: string[];
  avvisi: string[];
}
export function raggruppa(prelievi: Prelievo[], modo: ModoRaggruppamento): ProtostaControllo[];
```

### 1.5 Selezione Tipo A / Tipo B e procedura volumi > 1500 m³

**Selezione automatica (non a carico dell'utente)** — Tipo B è di uso reale per
il PO (capita di superare i 1500 m³). Kerios SUGGERISCE il tipo in base alla norma,
mai lasciando la scelta "a memoria" all'operatore:
```
volume miscela omogenea > 1500 m³        → Tipo B (statistico) obbligatorio
n prelievi ≥ 15                          → Tipo B applicabile
altrimenti (3 ≤ n < 15, ≤ 300 m³/controllo) → Tipo A
```
Regola pratica: Kerios propone il tipo corretto dai dati (volume getto + n
prelievi), evidenzia il motivo ("> 1500 m³ → Tipo B"), e consente all'utente di
confermare/forzare con flag tracciato (come per i raggruppamenti). Mai un default
silenzioso: la scelta è sempre visibile e motivata.

**Un solo motore**: Tipo A e Tipo B condividono prelievi, validità 20% e la
disuguaglianza sul minimo (Rc,min ≥ Rck − 3,5). Il Tipo B AGGIUNGE la parte
statistica (Rcm ≥ Rck + 1,48·s e i controlli CV). NON è un motore separato:
è lo stesso schema del Tipo A esteso (scelta architetturale confermata dal PO).

**Procedura volumi > 1500 m³**: si procede a gruppi di 15 prelievi (consigliato):
controllo sul gruppo corrente E sul cumulato di tutti i prelievi disponibili;
gruppi finali < 15 si accorpano al precedente.
> Implementare come funzione di orchestrazione sopra `controlloTipoB`.
> Milestone: prima il singolo controllo Tipo A/B, poi l'orchestrazione a gruppi.

### 1.6 Prescrizioni comuni (§ 11.2.5.3) — verifiche di supporto

- Prove di compressione entro **45 giorni** dalla data di getto; oltre, servono
  controlli in opera (carotaggi). L'engine può calcolare `dataProva − dataGetto`
  e segnalare se > 45 gg (AVVISO, non blocco).
- Identificazione provini, verbale di prelievo alla presenza del DL.

---

## 2. ACCIAIO PER C.A. — tondino B450C/B450A + rete elettrosaldata (§ 11.3.2)

> Valori verificati su NTC 2018 § 11.3.2 / Tab. 11.3.VI e Circolare 2019.
> Scope deciso col PO: tondino (barre) + rete elettrosaldata. Carpenteria = FUTURE.

### 2.0 Struttura del controllo (dai dati reali del PO)

Dal registro reale: ogni controllo di accettazione = **3 saggi**, prelevati da
**3 diametri diversi** dello stesso lotto/stabilimento. Per ogni saggio si
misura: `fy` (snervamento), `ft` (rottura), `Agt` (allungamento), `ft/fy`
(rapporto di incrudimento) e l'esito della prova di **piega**. Ciascun parametro
nel registro ha 3 colonne = i 3 saggi.

**Lotto**: 3 campioni ogni **30 t** di acciaio della stessa classe e stesso
stabilimento/centro di trasformazione (anche con forniture successive). Controllo
in cantiere obbligatorio, entro 30 giorni dalla consegna, prima della messa in opera.

### 2.1 Valori nominali (NTC § 11.3.2.1)

```
B450C:  fy,nom = 450 N/mm²   ft,nom = 540 N/mm²   (alta duttilità, laminato a caldo)
B450A:  fy,nom = 450 N/mm²   ft,nom = 540 N/mm²   (bassa duttilità, trafilato a freddo,
                                                   barre Ø 5–10 mm)
```

### 2.2 Controllo di accettazione in cantiere — struttura normativa (verificata)

> Verificato su NTC 2018 / Circolare 2019 (fonti normative). Due meccanismi
> DISTINTI, da non confondere:

**(A) Verifica del SINGOLO saggio in cantiere — VALORI CONFERMATI**
Criterio pratico applicato dai laboratori sul singolo saggio (confermato da
laboratorio ufficiale e materiale universitario; coerente coi dati reali del PO):
```
B450C:  425 ≤ fy ≤ 572 N/mm²   (572 = 450·(1,25+0,02))
        Agt ≥ 6,0 %
        1,13 ≤ ft/fy ≤ 1,37
        piega: assenza di cricche  → Positivo/Negativo
B450A:  425 ≤ fy ≤ 572 N/mm²
        Agt ≥ 2,0 %
        ft/fy ≥ 1,03
        piega: assenza di cricche
esito saggio = tutti i parametri entro limiti AND piega positiva
```
> NOTA (Circolare): ft/fy sul singolo campione ha valore "indicativo"; il valore
> caratteristico vero è verificato in stabilimento su molti campioni. Ma per il
> controllo di accettazione di cantiere di routine SONO QUESTI i valori che i
> laboratori applicano e che compaiono nei certificati / nel documento ST36.

**(B) Valore CARATTERISTICO su n prove — formula con coefficiente k**
Quando si calcola il valore caratteristico (es. per confronto col nominale o
col rapporto di sovraresistenza di progetto), i software dei laboratori applicano:
```
X_k = X_medio − k(n) · s        (per i minimi: fy, ft, Agt, ft/fy inferiore)
X_k = X_medio + k(n) · s        (per i massimi: fy/fy,nom, ft/fy superiore)
dove:
  X_medio = media degli n saggi
  s       = scarto quadratico medio (campionario, n−1)
  k(n)    = coefficiente funzione del numero n di prove, da Tab. 11.3.IV e 11.3.V
```
k(n) cala al crescere di n (più prove → stima più affidabile → k minore). I
valori di k riga-per-riga stanno nelle Tab. 11.3.IV (frattile 5%) e 11.3.V.

**Quando si usa cosa**: il controllo di cantiere di routine sui 3 saggi è il
criterio (A) min/max. Il criterio (B) caratteristico entra quando il progettista
ha adottato k=(ft/fy)k > 1,15 e il DL deve accertare il caratteristico, o per
valutazioni statistiche su più prove.

> VALORI NUMERICI DA TRASCRIVERE dal testo ufficiale (la "bibbia"), NON da fonti
> web che rimandano alla tabella senza trascriverla:
> - Tab. 11.3.VII a): intervalli min/max per fy, ft (o ft/fy), Agt — B450C e B450A.
> - Tab. 11.3.IV e 11.3.V: valori di k(n) in funzione di n.
> Finché non trascritti, restano segnaposto nel JSON soglie (sezione "acciaio").

Struttura del prelievo (certa): 3 saggi/3 diametri ogni 30 t, stessa classe e
stabilimento; entro 30 giorni dalla consegna. Valori nominali: fy,nom 450,
ft,nom 540 N/mm². Tipo del PO: B450C (dai dati).

### 2.3 Rete elettrosaldata — verifica aggiuntiva

Oltre a fy/ft/Agt/ft/fy sul filo, la rete ha la **resistenza al distacco del
nodo** saldato (UNI EN ISO 15630-2). Diametri elementi base B450C: 6 ≤ Ø ≤ 16 mm.
- L'engine acciaio distingue `tipoProdotto: 'barra' | 'rete'`.
- Per 'rete' abilita il campo/esito distacco nodo; per 'barra' NON lo richiede.
- Nei dati il diametro rete appare come `Ø6-10x10`, `Ø8-15x15` (filo + maglia).

### 2.3-bis Diametro: campo LIBERO con lettura tollerante

Nel registro reale la colonna Ø contiene: numeri puri (`12`,`16`,`24`), numeri
con suffisso (`12R`,`16R`,`14R`, rari `16B`,`24 A`), reti (`Ø6-15x15`) e qualche
valore anomalo (`3330`,`4964` = errori di inserimento). Decisione (PO):
- Il campo diametro è **LIBERO** in compilazione: accetta qualsiasi stringa,
  non blocca mai. Il diametro NON entra nei calcoli di verifica (fy/Agt/ft/fy si
  confrontano con le soglie a prescindere dal diametro): un suffisso è innocuo.
- Kerios LEGGE il valore senza imporre: estrae il **numero base** (12 da "12R")
  per raggruppare/filtrare, e conserva il suffisso così com'è.
- Suffisso `R`: significato non confermato (ipotesi: **R = riserva** oppure
  rotolo — vedi §2.3-ter). NON forzare un'interpretazione.
- Valori non interpretabili come diametro: accettati comunque, con icona discreta
  "valore insolito" (degrada con grazia, mai blocco).

### 2.3-ter Saggi di riserva (concetto operativo — da modello)

Prassi reale del PO: per ogni prelievo si confezionano **tre terne per il
laboratorio + tre terne di riserva**. La riserva serve alle **controprove** se un
controllo risulta non conforme.
- Il modello PrelievoAcciaio prevede (opzionale) l'indicazione dei saggi/terne di
  riserva disponibili.
- Uso futuro: se un controllo è NON conforme, Kerios ricorda "sono disponibili N
  saggi di riserva per controprova" (assistente, non blocco).
- DA COSTRUIRE in un raffinamento successivo, ma il modello dati lo PREVEDE da
  subito (come per il ciclo di vita): non modellare il prelievo acciaio senza
  spazio per la riserva.

### 2.4 Contratti (firme attese)

```ts
export type TipoAcciaio = 'B450C' | 'B450A';
export type TipoProdotto = 'barra' | 'rete';
export interface SaggioAcciaio {
  diametro: string;        // LIBERO: "12", "12R", "Ø6-10x10"... mai bloccare
  diametroBase?: number;   // letto da Kerios: 12 da "12R" (per filtri/raggruppo)
  diametroSuffisso?: string; // "R", "B"... conservato com'è (significato non forzato)
  nSpezzoni?: number;      // dal verbale reale: N° spezzoni per diametro
  lunghezzaMl?: number;    // dal verbale reale: lunghezza in ml
  identificativo?: string; // marchio/sigla del saggio (dal verbale)
  tipoAcciaio: TipoAcciaio;
  tipoProdotto: TipoProdotto;
  fy: number; ft: number; agt: number; ftfy: number;
  piega: 'positivo' | 'negativo';
  distaccoNodo?: 'positivo' | 'negativo'; // solo rete
  colata?: string;         // attributo del singolo saggio (confermato dal verbale)
}
export interface PrelievoAcciaio {       // = un controllo (3 saggi), ciclo di vita 3 fasi
  id: string; verbale: string; data: string;
  wbs: string; parte: string; produttore: string; colata?: string;
  lotto?: string;          // per verifica 30 t
  // fase 2/3 opzionali come per il cls:
  lettera?: string; certificato?: string; dataProva?: string; laboratorio?: string;
  saggi: SaggioAcciaio[];  // tipicamente 3 (le "terne" di laboratorio)
  riserva?: SaggioAcciaio[]; // terne di riserva per controprove (opzionale)
}
export interface EsitoSaggio {
  fy: boolean; agt: boolean; ftfy: boolean; piega: boolean; distaccoNodo?: boolean;
  conforme: boolean;
}
export interface RisultatoControlloAcciaio {
  esitiSaggi: EsitoSaggio[];
  conforme: boolean;       // tutti i saggi conformi su tutti i parametri
  avvisi: string[];
}
export function verificaSaggioAcciaio(s: SaggioAcciaio, soglie: SoglieAcciaio): EsitoSaggio;
export function controlloAcciaio(p: PrelievoAcciaio, soglie: SoglieAcciaio): RisultatoControlloAcciaio;
// valore caratteristico su n prove: X_medio -/+ k(n)*s  (k da Tab 11.3.IV/V)
export function coefficienteK(n: number, soglie: SoglieAcciaio): number;
export function valoreCaratteristico(valori: number[], k: number, verso: 'inf'|'sup'): number;
```

### 2.5 Layout documento controllo acciaio (modello ST36 AC1)

Verificato sul file reale. Intestazione 3 righe (opera / Megalotto / elemento+pk).
Colonne: Verbale, Data, Ø, Marchio produttore, Ubicazione, Denominazione,
Certificato, Data fine prove, fy, Agt, ft/fy, Piega, e i 4 **Esiti di controllo**
(fy, Agt, ft/fy, Piega) per saggio — rif. "Tab. 11.3.VI". Firma DL in fondo
(es. "IL DIRETTORE LAVORI / Ing. ..."). Esito per cella: Positivo/Negativo.

---

## 3. CONTRATTI DELLE FUNZIONI (firme TypeScript attese)

```ts
// domain/cls.ts
export interface Provino { r: number; }                 // N/mm²
export type StatoPrelievo = 'verbale' | 'trasmesso' | 'refertato';

export interface Prelievo {
  id: string;
  // --- Fase 1: VERBALE (sempre presenti) ---
  verbale: string;
  data: string;            // data verbale, gg/mm/aaaa
  wbs: string;
  parte: string;
  rck: number;
  mix: string;
  massaVolumica?: number;  // kg/m³, opzionale (UNI EN 12390-7), colonna prima di Rck
  volumeGetto?: number;    // m³, opzionale (avviso limite 300 m³)
  slump?: number;          // mm, consistenza al getto (confronto vs classe del mix)
  oraPartenza?: string;    // hh:mm, autobetoniera (tempo trasporto)
  oraArrivo?: string;      // hh:mm
  oraScarico?: string;     // hh:mm (tempoTrasporto = scarico - partenza, avviso >90')
  // --- Fase 2: TRASMESSO (opzionali finché non si invia la lettera) ---
  lettera?: string;        // protocollo richiesta D.L.
  dataRichiesta?: string;
  protRicezione?: string;
  dataRicezione?: string;
  // --- Fase 3: REFERTATO (opzionali finché non arriva il certificato) ---
  certificato?: string;
  dataCertificato?: string;
  laboratorio?: string;
  dataProva?: string;
  r1?: number;
  r2?: number;
  // derivati (calcolati, non digitati):
  // rmedio = (r1+r2)/2 quando refertato; stato = statoPrelievo(p)
}

export function statoPrelievo(p: Prelievo): StatoPrelievo;
export function resistenzaPrelievo(p: Prelievo): number | undefined; // undef se non refertato

export interface EsitoValidita {
  scartoPct: number;
  valido: boolean;
}

export type TipoControllo = 'A' | 'B';

export interface RisultatoControllo {
  tipo: TipoControllo;
  n: number;
  rck: number;
  rcm28: number;
  rcmin: number;
  rckEffettiva: number;    // MIN(Rmin+3.5, Rm-3.5) — mostrata nel documento
  s?: number;              // solo Tipo B
  cv?: number;             // solo Tipo B
  disug1: { richiesto: number; valore: number; ok: boolean };
  disug2: { richiesto: number; valore: number; ok: boolean };
  conforme: boolean;
  forzato: boolean;        // true se l'utente ha confermato nonostante avvisi
  avvisi: string[];        // es. "CV>0.15", "mix non omogeneo", ">300 m³"
  miscelaOmogenea: boolean;// false se i prelievi hanno mix diversi
}

export function validitaPrelievo(r1: number, r2: number): EsitoValidita;
export function resistenzaPrelievo(r1: number, r2: number): number;
export function controlloTipoA(prelievi: Prelievo[]): RisultatoControllo;
export function controlloTipoB(prelievi: Prelievo[]): RisultatoControllo;
export function scartoQuadraticoMedio(valori: number[]): number; // n-1
// suggerisce il tipo di controllo dai dati (volume + n prelievi), con motivazione
export function suggerisciTipoControllo(
  prelievi: Prelievo[], volumeMc?: number
): { tipo: 'A' | 'B'; motivo: string };

// diagnostiche (NON entrano nei controlli NTC di resistenza):
export function plausibilitaMassaVolumica(mv?: number): string | null; // avviso se <2200 o >2500
export function classeConsistenzaDaMix(mix: string): 'S1'|'S2'|'S3'|'S4'|'S5'|null;
export function verificaSlump(slump?: number, mix?: string): string | null; // avviso se fuori classe
export function tempoTrasporto(oraPartenza?: string, oraScarico?: string): number | null; // minuti
export function verificaTempoTrasporto(oraPartenza?: string, oraScarico?: string): string | null; // avviso >90'

// fasi temporali e semaforo preliminare:
export type SemaforoPrelievo = 'conforme' | 'da_verificare' | 'fuori_soglia';
export function stagionaturaGiorni(p: Prelievo): number | null; // dataProva - dataPrelievo
export function esitoPreliminare(p: Prelievo, soglie: Soglie): { stato: SemaforoPrelievo; note: string[] };

// configurazione esterna e indice qualità:
export interface Soglie { /* shape del soglie.json (vedi §1.4-octies) */ }
export function caricaSoglie(json: unknown): Soglie;
export interface IndiceQualita {
  opera: string; punteggio: number;          // 0..100
  pctConformi: number; margineMedio: number; dispersione: number;
  pctSlumpInClasse: number; pctTrasportoOk: number;
  livello: 'alta' | 'media' | 'da_attenzionare';
}
export function indiceQualitaOpera(prelievi: Prelievo[], controlli: RisultatoControllo[], soglie: Soglie): IndiceQualita;
```

> Regola: `rmedio` va RICALCOLATO da r1,r2 in import, non preso dal CSV
> (il CSV può avere arrotondamenti). Confrontare col valore CSV come check.

---

## 4. DOCUMENTI ALLEGATI E IPERLINK (cls e acciaio)

> Da indicazioni PO + verifica normativa. Distingue documenti SOLO-RIFERIMENTO
> (data+protocollo) da documenti ALLEGATI (file con iperlink).

### 4.1 Lettere di trasmissione — SOLO riferimento (no file)
Le lettere (richiesta DL, ricezione) seguono il flusso amministrativo INTERNO,
fuori da Kerios. Kerios registra SOLO **data + protocollo** (campi Fase 2). NON
sono file allegati, non hanno iperlink a documento. Già modellato così.

### 4.2 Documenti ALLEGATI con iperlink (file)
Documenti di cui Kerios tiene il FILE (foto/scansione/PDF), collegati in modo
UNIVOCO al verbale, cliccabili (iperlink) come verbale/certificato:

**Calcestruzzo:**
- DDT di trasporto: **UNA** per prelievo (un impasto = una DDT). È anche la
  FONTE dati del verbale (l'operatore ci legge i dati del getto). Foto/scansione.

**Acciaio:**
- Documento di trasporto della fornitura.
- Documenti di **COLATA**: **PIÙ d'uno** per verbale. La colata è attributo del
  SINGOLO SAGGIO (i 3 saggi vengono da 3 diametri diversi, spesso di colate/
  produttori diversi — confermato dai dati reali e dalla Circolare C11.3.2.12,
  che chiede di variare i diametri). Quindi fino a ~3 documenti di colata per
  verbale, legati ai rispettivi saggi.

### 4.3 Chi allega e quando (PO)
Operatore se può (foto nell'app Cantiere, allegata al JSON del verbale), ALTRIMENTI
il DL dopo, in Kerios desktop (drag&drop / picker). Entrambe le vie supportate.
L'allegato resta legato in modo UNIVOCO al verbale (e, per le colate, al saggio).

### 4.4 Modello dati (estensione)
```ts
interface Allegato {
  tipo: 'ddt' | 'colata' | 'doc_trasporto' | 'certificato' | 'verbale';
  fonte: 'operatore_app' | 'dl_desktop';
  handleRef?: string;   // riferimento al file (IndexedDB/OneDrive)
  nomeFile?: string;
}
// Prelievo CLS:   ddt?: Allegato            (una)
// Prelievo Acciaio: docTrasporto?: Allegato ; e ogni SaggioAcciaio: colata?: Allegato
```
Riepilogo documenti collegati per materiale:
- CLS: verbale (auto-generato), DDT (allegato), certificato (allegato),
  lettera (solo data+protocollo).
- ACCIAIO: verbale, doc. trasporto (allegato), colate (allegati per saggio),
  certificato (allegato), lettera (solo data+protocollo).
