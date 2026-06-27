# Generazione verbali — templating sui template .docx aziendali

> DECISIONE PO (disinnesca il rischio principale): Kerios genera SOLO il **.docx
> compilato** (maturo nel browser). Il PDF lo produce l'UTENTE (Word → "salva
> come PDF"). Kerios NON converte docx→PDF client-side.
> VINCOLO: il PDF dell'utente deve poter essere COLLEGATO (iperlink) alla riga
> del registro del verbale (come DDT/colate). Flusso: Kerios genera .docx →
> utente salva come PDF → collega il PDF in Kerios → iperlink alla riga.
> Niente html2canvas, niente conversione docx→PDF nel browser. M6 si semplifica.

> I template ufficiali del PO sono in reference/templates/:
> - template_verbale_calcestruzzo.docx
> - template_verbale_acciaio.docx
> Sono GOVERNANCE di qualità aziendale: raramente cambiano. NON ridisegnare il
> verbale in codice — si RIEMPIE il template.

## Struttura del template (verificata)

Intestazione fissa (tabella, si ripete a ogni pagina): logo a sinistra, titolo al
centro ("Verbale di prelievo calcestruzzo" / "Acciaio"), a destra codice e
versione del modulo. Poi un unico grande segnaposto per il corpo.

Segnaposto presenti:
- `{%logo_aziendale}` — immagine logo (il prefisso % indica immagine).
- `{modulo_codice}`   — codice del modulo (sistema qualità).
- `{modulo_versione}` — versione del modulo (sistema qualità).
- `{corpo_html}`      — corpo dinamico del verbale (dati prelievo + tabella
                        cubetti/saggi + firme).

## Flusso di generazione (via più semplice — decisa da CTO)

```
template .docx (cornice qualità, fisso)
  + dati verbale (dal modello dominio)
  + firme (immagini canvas)
  + logo, codice, versione modulo
        │  templating: sostituzione segnaposto
        ▼
  docx COMPILATO (fedele al modulo aziendale)
        │  conversione
        ▼
  PDF finale (testo selezionabile, da firmare/archiviare/allegare)
```

Motivazioni (verificate su web):
- I template a segnaposto = pattern "template generation": testo che si riadatta,
  tabelle ridimensionabili, paginazione corretta. react-pdf NON supporta questo
  pattern (disegna da zero) → NON adatto ai template del PO.
- html2canvas/screenshot = VIETATO: HTML fluido vs PDF rigido, pagine/tabelle
  si spezzano male; verbale-immagine di qualità inaccettabile per atto legale.
- Quindi: libreria di docx-templating (template+dati→docx) + conversione a PDF.

## Il corpo HTML (`{corpo_html}`)

Generato da Kerios/K2 dal modello di dominio. Il template è la CARTA (cornice
qualità: logo, codice/versione modulo, header ripetuto); il `{corpo_html}` è ciò
che si SCRIVE sopra. Tutto il layout dettagliato del corpo vive nell'HTML, NON
nel template. Il corpo deve RIPRODURRE FEDELMENTE il layout dei verbali reali di
riferimento (reference/verbali/) per qualità interna; il PO valida in collaudo.
Contiene:
- intestazione dati prelievo (opera, parte, data, mix/diametro, ecc.);
- tabella dei cubetti (cls) o dei saggi (acciaio) con i valori;
- riferimenti documentali (numero verbale dal Cuore, DDT/colate, certificato);
- blocco firme (operatore + presenti) come IMMAGINI (canvas → png).

## Firme

Raccolte come canvas (in K2 soprattutto), esportate in immagine e inserite nel
corpo. Nel docx finale sono immagini incorporate (come il logo). Mai testo.

## Due uscite, un motore

- docx compilato: versione fedele al modulo (editabile se serve).
- PDF: versione "congelata" per firma/archivio/iperlink (collegata al verbale).
Stesso motore di templating, due output. Vale per ENTRAMBI i materiali (stessi
segnaposto, template diverso solo nel titolo) → un'unica implementazione.

## Relazione con le milestone

- M6 (era "PDF controllo"): diventa generazione verbale via templating docx→pdf.
- M11 (K2): l'app cantiere produce il corpo + firme; il numero viene dal Cuore.
- Kerios desktop: importa il JSON, genera/rigenera il verbale dal template.
