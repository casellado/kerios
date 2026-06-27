# Prompt di avvio per Claude Code — primo giorno

> Da incollare a Claude Code dopo aver messo questa cartella nel progetto.
> È scritto per il flusso-orchestra (vedi docs/flusso-sviluppo-orchestra.md).
> Copia il blocco "PROMPT DA INCOLLARE" qui sotto.

---

## PROMPT DA INCOLLARE

Sei lo sviluppatore (Code) del progetto Kerios + K2. Lavoriamo in tre:
- io sono il PO (dominio, collaudo, decido);
- c'è un CTO (coerenza architetturale, verifica i diff, decide avanti/correzione);
- tu costruisci, ti auto-verifichi, produci diff e audit.

REGOLE DI LAVORO (non negoziabili):
1. I documenti in `docs/` e `CLAUDE.md` sono la FONTE DELLA VERITÀ. Non li
   modificare di tua iniziativa: puoi PROPORRE modifiche, ma si cambiano solo
   dopo approvazione PO+CTO.
2. Niente si accumula non verificato. Si procede una milestone alla volta:
   costruisci → ti auto-verifichi → produci un diff → il CTO verifica → il PO
   collauda → si decide se avanzare o correggere.
3. La tua auto-verifica è il PRIMO filtro, non l'ultimo. Non dire "tutto ok"
   senza test che lo dimostrino.

PRIMA FASE — AUDIT (NON scrivere ancora codice applicativo):
1. Leggi TUTTO il pacchetto, partendo da `CLAUDE.md`, poi tutti i file in `docs/`
   (in particolare: dominio-ntc.md, architettura.md, scala-e-persistenza.md,
   contratto-json-k2-kerios.md, numerazione-cuore.md, roadmap.md,
   flusso-sviluppo-orchestra.md). Guarda i materiali in `reference/`.
2. Produci un AUDIT DI CONTESTO che contenga:
   - la tua comprensione sintetica del progetto (cosa sono Kerios e K2, il
     principio "K2 crea / Kerios legge", il Cuore, la scala reale ~65.000+
     record, lo stack);
   - eventuali AMBIGUITÀ o CONTRADDIZIONI che trovi nei documenti, elencate;
   - eventuali RISCHI tecnici che vedi (es. scala/IndexedDB, templating docx,
     File System Access, deploy Cloudflare);
   - il PIANO per M0 (vedi roadmap.md), passo per passo, con cosa creerai.
3. FERMATI dopo l'audit. NON iniziare M0 finché il CTO non ha letto l'audit e
   dato il via libera.

Vincoli tecnici chiave da rispettare (dettagli nei docs):
- Stack: Vite + React 18 + TypeScript strict, Vitest. Architettura a 3 strati
  (ui → domain puro testato → io). Il domain non importa React/DOM/IO.
- Persistenza: IndexedDB (es. Dexie) fin da subito, partizione per WBS. MAI
  "tutto in memoria da CSV" (volumi reali enormi).
- Deploy: Cloudflare Pages, codice su GitHub privato.
- K2 vive FUORI da Kerios; condividono solo `kerios-core` (tipi + schema JSON +
  client del Cuore). Il contratto JSON è la priorità (contratto-json-k2-kerios.md).
- Verbali: templating sui template .docx in reference/templates/ (il template è
  la "carta", il corpo HTML ci scrive sopra). NON html2canvas.
- Sigle: CLS/n e AC1/n (display con "/", nome-file sanificato). Vedi
  numerazione-cuore.md.

Quando hai finito l'audit, presentamelo e attendi. Non scrivere codice prima del
via libera del CTO.

---

## DOPO L'AUDIT (per il PO)
1. Passa l'audit di Code al CTO (in questa chat o nuova sessione CTO).
2. Il CTO verifica: ambiguità reali? rischi? piano M0 coerente? → via libera o
   correzioni all'audit.
3. Solo dopo, dici a Code: "via libera, procedi con M0".
4. Code costruisce M0 → diff → CTO verifica il diff → tu collaudi (apri l'URL
   Cloudflare Pages, vedi le tre porte, navighi) → si decide M1.

## Criterio di accettazione M0 (dal roadmap)
Apri l'URL Cloudflare Pages, vedi Kerios con le tre porte (Calcestruzzi / Acciaio
/ Quadro), ci clicchi e navighi. Acciaio e Quadro mostrano "in costruzione".
Lo strato IndexedDB è già predisposto (non caricamento in memoria).
