# Flusso di sviluppo — l'orchestra PO + CTO + Code

> Metodo di lavoro per la fase di sviluppo di Kerios/K2. Tre attori:
> - **PO** (utente): conosce il dominio, collauda, decide.
> - **CTO** (Claude): tiene coerenza architetturale e memoria del progetto,
>   verifica i diff, decide se avanzare o correggere.
> - **Code** (Claude Code): costruisce, si auto-verifica, produce diff e audit.
> Proposto dal PO, affinato dal CTO con 3 salvaguardie (segnate [CTO]).

## Setup iniziale (una tantum)
1. Il PO carica i documenti nella cartella del progetto Kerios (repo).
2. Si chiede a Code di sistemarli secondo le buone pratiche di Claude Code
   (struttura repo, CLAUDE.md a contesto, ecc.).
   [CTO] I documenti sono la FONTE DELLA VERITÀ (il contratto). Code può
   leggerli e PROPORRE modifiche, ma NON li cambia di sua iniziativa. Si
   aggiornano solo dopo approvazione PO+CTO. Mai Code da solo.

## Il LOOP (per ogni milestone / task)

### 0. Audit di contesto (Code → CTO)
Prima di ogni giro, Code esamina il contesto attuale e produce un **audit**:
cosa esiste, cosa è cambiato, stato dei test, punti aperti. Il CTO lo legge
PRIMA, per impostare il loop sulla base di dov'è davvero il progetto.

### 1. Task di implementazione (Code)
Code costruisce la milestone e SI AUTO-VERIFICA: assenza di bug, errori, colli
di bottiglia, criticità; test verdi. Produce un **diff dettagliato**.
[CTO] L'auto-verifica di Code è il PRIMO filtro, NON l'ultimo: chi scrive è
cieco ai propri errori. Un "tutto ok" di Code è punto di partenza, non garanzia.

### 2. Verifica rapida del diff (CTO)   ← [CTO] passo anticipato
Il CTO esamina il diff PRIMA del collaudo: è coerente coi documenti? rispetta
l'architettura (3 strati, dominio puro, scala, ecc.)? rischi evidenti?
→ se regge strutturalmente: via libera al collaudo.
→ se c'è un problema strutturale: torna a Code (task di correzione) PRIMA che il
  PO sprechi tempo a collaudare codice da rifare.
[CTO] Questo scambio d'ordine (CTO prima, collaudo dopo) evita collaudi sprecati.

### 3. Collaudo (PO)
Il PO collauda il funzionamento reale, con la tranquillità che strutturalmente
regge. Annota impressioni PRECISE: cosa funziona, cosa no, cosa non torna
rispetto a come si lavora davvero.

### 4. Sintesi del giro (PO → CTO)
Il PO passa al CTO il diff + le impressioni di collaudo.

### 5. Decisione (CTO)
Il CTO verifica tutto insieme (audit + diff + collaudo PO):
→ AVANTI alla milestone successiva (torna al passo 0), oppure
→ TASK DI CORREZIONE per Code (torna al passo 1 con le correzioni precise).

## Le 3 salvaguardie [CTO] in sintesi
1. **Verità nei documenti**: Code non li cambia da solo; solo PO+CTO approvano.
2. **Auto-verifica ≠ garanzia**: il collaudo PO + la verifica CTO sono la rete
   vera, non l'auto-controllo di Code.
3. **Ordine: CTO verifica il diff PRIMA del collaudo PO**: niente collaudi
   sprecati su codice da rifare.

## Principio guida
Niente si accumula non verificato. Ogni milestone è collaudata e approvata prima
della successiva. Il progetto avanza solo su fondamenta solide.
