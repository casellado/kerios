# Flusso di campo — getto calcestruzzo (dominio reale, per K2/bot)

> Raccontato dal PO (20+ anni di DL/ispettore, cantiere Megalotto). Serve a K2
> per GUIDARE come un collega esperto un ispettore NUOVO, senza esitazioni.
> NB: K2 = bot che guida passo-passo. Il bot deve conoscere i BIVI e gli ERRORI
> tipici del novizio, non solo i campi.

## FASE 0 — preliminare (mattina): coordinamento
Vedi docs/lavagna-getti.md. Note dal PO:
- un getto può essere ANNULLATO (per vari motivi) → la WBS torna libera.
- un ispettore può seguire PIÙ WBS vicine con orari diversi → può prenotare più
  WBS sulla Lavagna. (La selezione multipla è ammessa.)

## FASE 1 — accettazione del carico (PRELIMINARE, FUORI da K2)
> CRITICO: questa fase è TUTTA preliminare e avviene FUORI da K2. L'operatore usa
> i suoi strumenti per lo slump. K2 NON sa nulla di questa fase: non gestisce
> rifiuti, bivi, ripetizioni. K2 si apre SOLO se il carico è accettato.

1. Arriva l'autobetoniera. L'operatore chiede la **DDT**.
2. **Verifica mix design** = quello di progetto per quella WBS.
3. Esegue lo **slump-test**. BIVIO (avviene nella testa/strumenti dell'operatore,
   NON in K2):
   - slump TROPPO ALTO (troppo fluido) → NON recuperabile → **carico RIFIUTATO**,
     betoniera rimandata indietro. Si passa ad altra betoniera. NON si annota
     nulla in nessun sistema (è fatto commerciale dell'impianto, non dell'opera).
     K2 non viene nemmeno aperto.
   - slump TROPPO BASSO (troppo asciutto) → **aggiunta fluidificante** → si RIPETE
     lo slump → quando OK, si procede (l'avvenuta aggiunta si annoterà nel campo
     NOTE del verbale, che però si compila DOPO, a carico accettato).
   - slump OK → si ACCETTA il carico → SOLO ORA entra in gioco K2.
4. Carico accettato: l'operatore ha i valori da riportare nel verbale — **slump
   (mm)** dell'ultima prova buona, **temperatura ambiente**, **temperatura
   calcestruzzo**, **MC nell'autobetoniera** (dalla DDT, ~10).
5. **Autorizza il getto** e ordina i **cubetti 15×15×15**.

> CONSEGUENZA (semplificazione importante): poiché K2 si apre solo a carico
> accettato, NON esiste il problema del "numero sprecato per un rifiuto": il
> numero di verbale si chiede dentro K2 quando il carico è GIÀ buono. K2 non ha
> modalità "accettazione carico" né "rifiuto". Fa solo il verbale di un carico ok.
4. Carico accettato → registra: **slump (mm)**, **temperatura ambiente**,
   **temperatura calcestruzzo**, **MC nell'autobetoniera** (dalla DDT, ~10).
5. **Autorizza il getto** e ordina il confezionamento dei **cubetti 15×15×15**.

## FASE 2 — verbale (a carico accettato)
6. **Chiama il numero di verbale con K2** (numero dal Cuore; vedi
   numerazione-cuore.md). Prima della galleria/dove c'è campo.
7. **Cartellini cartacei** per i cubetti: SEMPRE 4 (A, B, C, D).
   Su ciascuno: **sigla + numero verbale + lettera** (A/B/C/D).
   → bot: genera i 4 cartellini dal numero preso; il novizio non si confonde.
   NB: 4 cubetti = un VERBALE (un carico). I 3 PRELIEVI del controllo Tipo A sono
   altro livello (aggregano più verbali). Non confondere.
8. Mentre si getta: compila il verbale in tutte le sezioni — ubicazione del getto,
   **presenti al getto** (che firmeranno), e tutto ciò che il verbale prevede
   (dettaglio dal template verbale, da caricare).
9. **Un verbale = una autobetoniera** (un carico). Nessun raggruppamento di carichi.

## FASE 3 — chiusura
10. Verbale **firmato dai presenti** (firme canvas in K2).
11. **Scansionato e archiviato** nella cartella verbali.
12. Con i dati si **scrive il registro**.
13. Il verbale prevede SEMPRE lo spazio per il **DL: "firma per visto"**.

## Note per il bot (sintesi missione)
- K2 entra SOLO a carico accettato: niente fase rifiuto/bivi dentro l'app (sono
  preliminari, fuori da K2). K2 fa il verbale di un carico già buono.
- I punti dove il novizio sbaglia (mix design, bivio slump alto/basso) sono
  gestiti dall'operatore in campo; il bot li può comunque RICHIAMARE come
  promemoria/guida formativa, ma la decisione e l'azione sono fuori app.
- Dentro K2: cartellini A/B/C/D dal numero, compilazione verbale, firme.
- Tono: collega esperto accanto, un passo alla volta, nessun disagio.
