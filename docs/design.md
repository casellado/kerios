# Design Kerios

Direzione approvata dal PO: **strumento tecnico di precisione**. Estetica da
strumentazione / quadro di cantiere. NON usare i default "AI" (cream + serif +
terracotta). Il prototipo `reference/index.html` è il riferimento vivo.

## Token colore

```
--ink:        #14181d   testo principale
--ink-soft:   #4a5460   testo secondario
--line:       #d4d9df   hairline / bordi
--line-soft:  #e7eaee
--paper:      #f3f5f7   fondo app
--surface:    #ffffff   card / superfici
--steel:      #1f3a5f   blu acciaio (brand)
--steel-700:  #16293f
--signal:     #f5c518   giallo segnale (accento, sicurezza cantiere)
--ok:         #1f7a4d / bg #e6f4ec   conforme
--warn:       #b06a00 / bg #fbf0db   attenzione
--bad:        #b3261e / bg #fbe8e7   non conforme / prelievo nullo
--focus:      #2f6df6   focus ring
```

## Tipografia

- **Dati tecnici, codici, valori numerici**: monospace (SF Mono / Cascadia /
  Consolas). I numeri di resistenza, i codici verbale/certificato, gli esiti di
  calcolo vivono in mono — comunica "strumento di misura".
- **Testo UI**: Inter / system sans.
- Etichette di sezione: maiuscoletto, letter-spacing ampio, piccolo.

## Principi

- **La tabella è densa ma leggibile.** Header sticky, righe con hover, riga
  selezionata evidenziata. Allineamento numerico a destra in mono.
- **Il giallo segnale si spende UNA volta**: barra di selezione attiva, accento
  della porta "Quadro generale", avvisi discreti. Non decorare.
- **Stati comunicati con testo + colore + forma**, mai colore da solo.
- **Tre porte** in home con barra colore laterale per materiale.
- Movimento minimo: hover sulle porte, nessuna animazione gratuita.
  Rispettare `prefers-reduced-motion`.

## Info contestuale ⓘ — il PERCHÉ normativo, a portata di clic

> Decisione PO+CTO. Funzione **trasversale** (non una milestone): vale ovunque
> Kerios prenda una decisione "automatica".

Ogni scelta che Kerios fa AL POSTO dell'utente (un esito, una soglia, un
raggruppamento per miscela omogenea, un tipo di controllo, un guardrail, un
allegato dovuto) **nasce con una piccola ⓘ** accanto. Cliccandola si apre una
spiegazione di **2-3 righe** del **perché normativo**, con la **citazione NTC
ESATTA** (pescata da `dominio-ntc.md`, non inventata). Non un help generico: la
ragione puntuale di QUELLA scelta, lì dove appare.

Principio (coerente con `filosofia-kerios.md`): l'automatismo toglie fatica, ma
l'operatore resta in controllo **capendo** perché. La ⓘ rende l'automatismo
**trasparente e verificabile**, non una scatola nera.

Regole:
- **Breve e a richiesta**: l'icona è discreta; il testo compare al clic/tasto, non
  ingombra. Niente muri di testo.
- **Citazione esatta**: la frase normativa è quella di `dominio-ntc.md` (fonte
  unica); se cambia lì, cambia ovunque. Mai parafrasi a memoria.
- **a11y**: l'icona è un vero `<button>` con `aria-label` ("Perché?"), apribile da
  tastiera, il popover è annunciato e chiudibile con Esc; mai solo hover.
- **Nuove UI nascono con la loro ⓘ**: da ora ogni parte nuova con una scelta da
  spiegare include la ⓘ fin da subito. Le schermate **M1-M4** già fatte
  recuperano le ⓘ mancanti in un **giro mirato** dedicato.

## Accessibilità (vincolante, vedi CLAUDE.md §5)

- `<table>` semantica, `<th scope="col">`.
- Checkbox riga con `aria-label` descrittivo (verbale + parte + Rck).
- Esiti via `aria-live="polite"`; errori bloccanti `assertive`.
- Focus visibile 3px (`--focus`), navigazione tastiera completa.
- Contrasto AA su testo e controlli.

## Documenti PDF (output)

Layout sobrio e istituzionale, coerente coi colori brand ma stampabile in B/N:
intestazione con dati opera/WBS, tabella prelievi, blocco verifiche con le
disuguaglianze NTC esplicite, esito ben visibile, spazio firma DL. Testo
selezionabile (templating su template .docx aziendale → docx compilato → PDF,
non immagine; vedi docs/verbali-template.md).
