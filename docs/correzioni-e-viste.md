# Viste di Kerios e politica delle correzioni

> Decisioni PO+CTO. Due temi collegati emersi insieme: chi vede cosa, e cosa si
> può correggere.

## 1. Viste — un solo Kerios, nessuna "modalità"
Kerios è SEMPRE lo stesso software. La vista dipende SOLO da quale cartella si
collega (File System Access):
- collegato a una cartella **WBS** (o a una cartella locale di lavoro) → vede e
  lavora su quel pezzo (l'operatore qualità sulle sue ~4 WBS);
- collegato alla **radice "VERITÀ"** su OneDrive → vede TUTTO complessivamente
  (il responsabile qualità / DL / RUP: supervisione dell'intero cantiere).
NESSUNA distinzione di modalità nel codice: la struttura cartelle fissa
(struttura-cartelle.md) permette a Kerios di leggere sia un ramo (una WBS) sia
l'intero albero (la verità) con lo stesso codice.

> Modello mentale del PO (azzeccato): OneDrive = "libro mastro" (verità
> condivisa), i PC = "nodi" con copia locale di backup. Forma distribuita: una
> verità centrale + copie locali che la alimentano (riconciliazione MANUALE via
> copia-incolla, non automatica).

## 2. I cruscotti scalano con la vista
I tre cruscotti (cls/acciaio/combinato) e il Quadro generale (cruscotti.md)
hanno senso pieno sulla vista VERITÀ: il responsabile vede conformità, copertura
lotti, buchi di controllo dell'intero cantiere. L'operatore sulle sue WBS vede i
cruscotti del suo pezzo. Stessa funzione, scala diversa secondo la cartella
collegata.

## 3. Chi legge / chi scrive (niente conflitti)
- Responsabile (vista verità): LEGGE/supervisiona + il DL appone il "visto".
- Operatori (vista pezzo): DEPOSITANO i loro verbali (le loro WBS).
Chi legge tutto non scrive sui singoli verbali; chi scrive lavora sul suo pezzo.
Coerente con partizione per WBS (un proprietario per cartella).

## 4. Politica delle correzioni (equilibrio CTO, sicuro per il DL)
Principio: l'errore umano esiste; poter correggere è giusto. MA i verbali firmati
hanno valore legale → la correzione su di essi va TRACCIATA (a tutela del DL).

| oggetto | correzione | traccia |
|---------|-----------|---------|
| Dati di lavoro (prelievo non firmato, campi in compilazione) | LIBERA e silenziosa | nessuna (è lavoro in corso) |
| Verbale FIRMATO e archiviato | POSSIBILE (non bloccata) | TRACCIATA: cronologia "campo X: da A a B, il giorno Y" |

- La cronologia esiste SOLO per i verbali firmati (confine posto dal PO), NON per
  tutto. Il resto resta leggero.
- Scopo della traccia: TUTELA del DL, non sospetto. In un contenzioso, dimostrare
  che una correzione è avvenuta in modo trasparente (non un dato alterato di
  nascosto) è una garanzia. Stesso spirito del timestamp OneDrive, reso esplicito
  e leggibile dentro Kerios per i documenti legali.
- Implementazione (per Code): sui verbali con stato "firmato", ogni modifica
  registra una voce di changelog nel JSON del verbale (campo es. `correzioni[]`
  con {campo, da, a, data}). NON serve UI pesante: una sezione "cronologia
  correzioni" consultabile. Sui dati non firmati: nessun changelog.

## 5. Principio generale (oltre i verbali)
"Se ci si accorge di un errore, è sempre meglio poter correggere" (PO). Kerios non
combatte chi lo usa: non impedisce correzioni. La cautela (tracciatura) si applica
SOLO dove c'è valore legale (verbali firmati), non ovunque.
