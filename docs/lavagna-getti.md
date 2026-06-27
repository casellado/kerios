# Lavagna dei getti — coordinamento ispettori (modulo condiviso)

> Problema reale (cantiere Megalotto: ~50 ispettori, 1 coordinatore, decine di
> WBS in parallelo): il coordinatore manda giorni/ora di getto via Excel; gli
> ispettori si auto-organizzano "a voce" → capita 2 ispettori sulla stessa WBS e
> 0 su un'altra dove l'impresa è pronta a gettare. Causa: nessuna vista CONDIVISA
> e in tempo reale di "chi ha già preso cosa".

## Cos'è
Una "lavagna" condivisa: il coordinatore appende le WBS da coprire (con giorno e
ora); gli ispettori vedono lo stesso stato in tempo reale e "tappano" quelle che
prendono (ROSSO = libera → VERDE = coperta). Sostituisce passaparola + Excel.

## Attori (NUOVO: terzo attore oltre Kerios e K2)
- **Coordinatore**: crea/aggiorna le righe (WBS + giorno/ora del getto).
- **Ispettori** (~50): vedono rosso/verde, prenotano toccando una WBS rossa.
- Distinto da Kerios (DL, desktop) e K2 (operatore, verbali). Mestiere diverso:
  COORDINARE l'assegnazione, non verbalizzare.

## Dato sul server — MINIMO (come il Cuore)
Per riga, SOLO:
- `wbsOpaca`   — codice opaco della WBS (mai il nome reale dell'opera)
- `data`, `ora`— quando è previsto il getto
- `stato`     — 'libera' (rosso) | 'coperta' (verde)
- `sigla?`    — sigla ispettore OPZIONALE (chi vuole si firma; verde basta)
NIENTE dati aziendali, nomi reali, risultati. Se compromesso, espone solo
"WBS-7 coperta oggi" → valore nullo. Stessa filosofia del Cuore.
> Chi ha DAVVERO fatto il controllo si scopre DOPO, dal verbale importato in
> Kerios — non serve duplicarlo qui. (Intuizione del PO.)

## Comportamento
- Coordinatore: aggiunge righe WBS+giorno/ora; può rimuoverle/aggiornarle.
- Ispettore: tocca una WBS rossa → diventa verde (con sigla opzionale).
- **Sblocco**: verde → rosso possibile (raro, per cambi di programma).
- **Arbitro sull'istante** (atomicità, come il Cuore): se due ispettori toccano
  la stessa WBS rossa nello stesso momento, vince il primo; all'altro appare
  "già presa". Evita il doppione spostato di un secondo.
- Tempo reale: il verde appare su tutti i ~50 dispositivi subito.
- Accessibilità: stato in testo OLTRE al colore (mai solo rosso/verde), per
  daltonici (coerente con CLAUDE.md §5).

## Hosting (stesso ecosistema, modulo separato)
- Cloudflare: stato condiviso in tempo reale (KV/D1 per lo stato; Durable Objects
  per il "tutti vedono subito" e l'arbitraggio atomico delle prenotazioni).
- Dati pochissimi e banali → rientra ampiamente nei limiti free verificati.
- MODULO SEPARATO dal Cuore: il Cuore tiene numeri, la Lavagna tiene stati. Non
  vanno mescolati (il Cuore deve restare puro).

## Relazione con le altre app
- È un terzo strumento (o una sezione condivisa) accessibile da mobile agli
  ispettori e da desktop al coordinatore.
- NON scrive verbali, NON importa JSON. Si limita al coordinamento.
- Collegamento indiretto: la WBS opaca è la stessa nomenclatura usata dal Cuore
  e dai registri → coerenza, ma nessun dato sensibile sul server.

## Stato
Modulo emerso in fase PO (cantiere reale). Da inquadrare come milestone propria
(es. dopo il nucleo Kerios/K2), non blocca il dominio NTC.
