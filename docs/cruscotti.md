# Cruscotti Kerios — calcestruzzo, acciaio, combinato

> Tre cruscotti distinti, richiesti dal PO. Ognuno con la STESSA gerarchia a 3
> livelli di priorità (l'occhio impara dove guardare):
>   P1 — Conformità & completezza  (la prima cosa a colpo d'occhio)
>   P2 — Qualità tecnica dei materiali
>   P3 — Avanzamento operativo (cosa manca / scadenze)
> Tutti su FATTI MISURATI. Mai "durabilità presunta" o previsioni (vedi §1.4-novies).
> Tutti partizionati e calcolati per WBS/opera (vedi scala-e-persistenza.md):
> il combinato e le viste globali leggono indici di sintesi, non i record interi.

## 1. Cruscotto CALCESTRUZZO

**P1 — Conformità & completezza**
- % controlli di accettazione conformi (per opera / globale)
- controlli NON conformi in evidenza (lista cliccabile)
- prelievi nulli (scarto >20%) evidenziati
- completezza documentale: verbale / lettera / certificato presenti per prelievo

**P2 — Qualità tecnica**
- margine medio sulle Rck effettive (quanto sopra soglia, non solo se sopra)
- dispersione dei risultati (CV / scarto tipo dei Rc)
- % slump in classe (vs classe del mix)
- % trasporti entro 90'
- % massa volumica in range (se valorizzata)
- indice di qualità cls per opera (composito, §1.4-novies)

**P3 — Operativo**
- prelievi in attesa di certificato (stato ≠ refertato)
- avvisi 45 giorni (getto→prova) e stagionatura
- getti/parti d'opera senza controllo associato

## 2. Cruscotto ACCIAIO

**P1 — Conformità & completezza**
- % saggi conformi (globale e per parametro: fy, Agt, ft/fy, piega)
- controlli con esito Negativo in evidenza (lista cliccabile)
- completezza documentale: verbale / lettera / certificato per prelievo

**P2 — Qualità tecnica**
- distribuzione fy / Agt / ft/fy rispetto ai limiti (425–572 / ≥6 / 1,13–1,37)
- esiti piega (% positivi)
- conformità per PRODUTTORE (individua un fornitore problematico)
- conformità per COLATA
- indice di qualità acciaio per opera (composito, analogo al cls)

**P3 — Operativo**
- copertura lotti: saggi vs 30 t della stessa classe/stabilimento
- saggi in attesa di certificato
- terne di RISERVA disponibili (per controprove su controlli non conformi)

## 3. Cruscotto COMBINATO (per opera) — fusione, non affiancamento

Vista per WBS/opera che FONDE i due materiali. Un'opera è "completa e conforme"
solo se ENTRAMBI i materiali lo sono.

**P1 — Semaforo di opera**
- per ogni opera/WBS: stato congiunto cls + acciaio
  (verde = cls ok E acciaio ok; giallo = qualcosa da verificare; rosso = non
  conforme o incompleto su almeno un materiale). Testo + colore, mai solo colore.

**P2 — Qualità complessiva per opera**
- indice di qualità combinato (media pesata cls/acciaio sui fatti misurati)
- evidenza dei punti deboli (es. "acciaio: 2 controlli non conformi su pila 12")

**P3 — Completezza/avanzamento per opera**
- cosa manca su entrambi i fronti (controlli mancanti, documenti mancanti,
  prelievi in attesa), così il DL sa se la documentazione di un'opera è completa.

## Implementazione (note per Code)

- Funzioni PURE in domain/ che, dati i controlli/prelievi, restituiscono gli
  indicatori. La UI dei cruscotti NON calcola.
- Calcolo su indici di sintesi per WBS (scala): non caricare i 65k record per
  mostrare un cruscotto globale.
- Grafici: vedi design.md (sobri, leggibili, stampabili). Accessibilità: ogni
  indicatore ha valore testuale oltre al grafico (mai solo colore/forma).
- Il combinato dipende dalla coerenza dei nomi opera tra i due registri → si
  appoggia al second brain / normalizzazione (vedi M8).
