# Second Brain — persistenza e suggerimenti (nessuna AI)

> Principio del PO: NIENTE caricamento preliminare di anagrafiche. Il setup
> iniziale muore con l'entusiasmo. Kerios IMPARA dall'uso: i verbali sono
> ripetitivi, quindi l'app ricorda ciò che hai inserito e lo suggerisce.
> "Second brain" = buona ingegneria della memoria, NON intelligenza artificiale.

## Cosa risolve (due problemi con un'idea)

1. Zero configurazione: le liste di opere/parti/mix/laboratori/impianti NON si
   caricano, si COSTRUISCONO da sole dai dati inseriti.
2. Coerenza dei nomi (per il Quadro generale): suggerendo i valori già usati,
   "S.S. 106 Jonica" resta identico ad ogni riuso → niente doppioni
   ("Edificio A"/"Edif. A"). La coerenza emerge come effetto collaterale.

## Dove vivono i dati

Nel file di progetto (OneDrive), un "dizionario d'uso" per campo: valori visti +
metadati (ultimo uso, frequenza) + associazioni ricorrenti. Serializzabile,
sincronizzato col resto. Nessun servizio esterno.

## Regole UX (soluzione "top", da best practice consolidate)

- **Suggerimenti al focus**: appena entri nel campo, mostra i valori probabili
  (spesso non si digita: si sceglie).
- **Ordinamento per RECENZA** (scelta PO): ultimo usato in cima. Per un flusso
  con stessa opera per settimane è l'ordine corretto.
- **Liste corte**: max ~7-10 voci, niente scroll; i primi 3 i più rilevanti.
- **Soglia anti-rumore**: nei campi liberi, un valore diventa suggerimento dopo
  alcuni usi (evita che un refuso digitato una volta torni come proposta).
  Per campi-chiave (opera, mix) si possono tenere tutti.
- **Highlighting invertito**: in grassetto la parte NON digitata (cosa resta da
  completare).
- **Accessibilità**: combobox ARIA (role=combobox, aria-expanded,
  aria-activedescendant), navigazione tastiera completa, annunci screen reader.
  Coerente con CLAUDE.md §5.

## Livello: AVANZATO con apprendimento delle combinazioni

Oltre al suggerimento per singolo campo, Kerios impara le COMBINAZIONI ricorrenti:
```
scegli opera "S.S. 106 Jonica"
  → pre-compila il mix / laboratorio / impianto usati di solito con quell'opera
  → l'utente CONFERMA o CORREGGE
```
Implementazione (no AI): tabella di co-occorrenza per opera→{campo:valore più
frequente/recente}. È statistica elementare sui dati locali, deterministica.

## Principio fermo (non negoziabile)

Il pre-compilato è SEMPRE una proposta, MAI un blocco:
- ogni campo resta liberamente modificabile;
- un valore nuovo entra nel dizionario per la volta successiva;
- ogni correzione aggiorna le statistiche (l'app migliora con l'uso).
Niente gabbie: la velocità del "quasi magico" senza imposizioni.

## Relazione con le altre parti

- Sostituisce il vecchio concetto di "liste controllate da caricare" (M9):
  le liste si auto-popolano.
- Alimenta sia l'inserimento diretto (M9) sia l'app Verbale leggera (M11).
- I dati restano nel file di progetto: il second brain è parte della single
  source of truth, non un deposito separato.
