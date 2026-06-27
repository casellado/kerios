# Via libera M0 — risposte del CTO all'audit di Code

> Da incollare a Code DOPO che ha consegnato l'audit. Sblocca M0.

Audit ricevuto e approvato. Ottimo lavoro: hai trovato un errore reale nei
documenti (caso test Tipo B) — è stato corretto. Ecco le decisioni; procedi con M0.

## Correzioni/decisioni sulle ambiguità che hai sollevato
1. [ALTA caso test Tipo B] CORRETTO in dominio-ntc.md §1.4: media e minimo erano
   scambiati. Ora: Rcm,15 = 53,1 (media), Rcmin,15 = 50,4 (minimo), Disug.1
   53,1 ≥ 53,3 → NO → NON CONFORME. Il PO confermerà i numeri esatti prima del
   test definitivo in M1; la struttura logica è questa.
2. [4 cubetti ↔ 2 resistenze] CHIARITO (dominio-ntc.md): al getto 4 cubetti
   confezionati (A–D); 2 provati a 28gg → R1,R2; 2 di riserva. Il controllo usa
   R1/R2; i 4 cubetti sono oggetti del verbale. R1/R2 = campi fase 3 (opzionali
   fino a refertazione).
3. [ft acciaio] DECISIONE CTO: `ft` è DERIVATO/opzionale (ft = ftfy·fy), non un
   input obbligatorio. I dati reali hanno solo fy, Agt, ft/fy. Il parser degrada
   con grazia sui "non testato".
4. [riferimenti tabella acciaio / k(n)] Rimandati a M7 (trascrizione dal testo
   ufficiale). Non bloccano ora.
5. [rckEffettiva Tipo B] DECISIONE CTO: per il Tipo B resta `undefined` (la
   conformità è Rcm ≥ Rck+1,48·s, semantica diversa dal Tipo A). Mostrarla solo
   per il Tipo A.
6. [mapping colonne acciaio] Riallineare sul file vero in M7.

## Decisioni operative per M0
- RADICE REPO: scaffolda nella cartella che contiene docs/ e reference/ (la
  cartella consegnata). Fai `git init` lì, con .gitignore adeguato.
- COLLAUDO M0: in LOCALE (`npm run preview`) come primo collaudo. Predisponi
  TUTTO il lato deploy (vite base:'/', _redirects SPA, workflow GitHub Actions
  per Cloudflare Pages); l'attivazione Cloudflare (account+repo) la fa il PO
  subito dopo, per l'URL pubblico. Non bloccare M0 sul deploy pubblico.
- STORE: Zustand confermato (scaffold minimo).
- kerios-core: struttura i tipi di dominio + lo schema JSON in un modulo
  ISOLABILE fin da M1 (es. src/core/), così si estrae a M11 senza riscrivere.
  Il contratto JSON (contratto-json-k2-kerios.md) è priorità: i tipi nascono lì.

## DOCX → PDF (rischio principale) — DISINNESCATO dal PO
DECISIONE PO: Kerios genera SOLO il .docx compilato. Il PDF lo fa l'utente
(Word → salva come PDF). Niente conversione docx→PDF client-side. VINCOLO: il PDF
dell'utente si COLLEGA (iperlink) alla riga del registro (come DDT/colate).
→ In M6 niente ricerca su conversione client-side; serve solo: generare il .docx
   (es. docxtemplater) + gestione allegato/iperlink PDF nel registro.
→ Per il modulo immagini (logo/firme nel docx): in M6 fai la ricognizione web
   delle opzioni (incl. licenze) e proponi, NON scegliere a memoria.

## REGOLA PERMANENTE (richiesta PO)
Prima di implementare un'area nuova, fai SEMPRE la ricognizione delle best
practice correnti sul web e portale nell'audit/diff con le opzioni e la scelta
motivata. Vale per ogni milestone (vedi CLAUDE.md).

## Procedi
Via libera a M0 con quanto sopra. Costruisci, auto-verifica (build verde, test
sanity verde, lint pulito, tre porte navigabili in preview), poi produci il DIFF
dettagliato per il CTO PRIMA del collaudo del PO.
