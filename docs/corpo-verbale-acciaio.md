# Corpo del verbale di prelievo — ACCIAIO (specifica per Code)

> Ricavato dal verbale reale del PO (S.S.106 M.3, tipologico). È il contenuto del
> {corpo_html} iniettato nel template (vedi verbali-template.md).
> Scope PO: SOLO acciaio da C.A. (barre da costruzione) + reti elettrosaldate.
> SCARTATI: C.A.P., carpenteria, micropali, tubi, altro.
> Header template (a destra): DATA prelievo + SIGLA con numero verbale.
> Per ogni campo: CHI lo riempie + come appare in K2 (form) e in Kerios (lettura).

## MODELLO MENTALE + LAYOUT FEDELE
Il template .docx è la CARTA (cornice qualità); l'HTML del `{corpo_html}` ci
scrive sopra. Il corpo deve RIPRODURRE FEDELMENTE il layout del verbale reale di
riferimento (reference/verbali/verbale_acciaio_reale.xls), sezione per sezione,
per qualità interna. Code lo costruisce nel `{corpo_html}`, il PO valida in
collaudo. Riferimenti a committente specifico NON cablati (configurabili).

## Legenda "chi riempie"
- [CUORE]  = assegnato dal Cuore (numero/sigla verbale)
- [OP]     = compilato dall'operatore in K2
- [SB]     = proposto dal second brain (recenza), modificabile
- [AUTO]   = derivato/calcolato

## 1. Testata — identificazione

> IN TESTA AL CORPO, prima di tutto: l'INTESTAZIONE DI COMMESSA (vedi
> docs/profilo-commessa.md) — descrizione lavori, n° contratto, committente,
> stazione appaltante, CUP, CIG. NON è dato del verbale: viene dal profilo
> progetto, riusata su tutti i verbali. Compare in testa al {corpo_html}.
| campo | chi | K2 (form) | Kerios (lettura) |
|-------|-----|-----------|------------------|
| Numero verbale + sigla | [CUORE] | mostrato, non editabile | ricostruito |
| Data prelievo | [OP] | date picker (gg/mm/aaaa) | lettura |
| Luogo di prelievo | [OP] | scelta: CANTIERE / CENTRO TRASFORMAZ. / MAGAZZINO / FERRIERA / ALTRO | lettura |
| WBS | [OP][SB] | select+aggiunta (recenza) | lettura |
| Descrizione | [OP][SB] | testo, proposto | lettura |
| Parte d'opera | [OP][SB] | testo, proposto | lettura |
| Progressiva prelievo | [OP] | testo/numero | lettura |
| Rif. V.I.R. | [OP] | testo (rif. interno) | lettura |
| Ferriera | [OP][SB] | testo, proposto | lettura |
| Centro di trasformazione | [OP][SB] | testo, proposto (se applicabile) | lettura |
| D.D.T. n° + del (data) | [OP] | testo + data | lettura |

> Il "luogo di prelievo" incide sull'inquadramento normativo (cantiere vs centro
> di trasformazione). Tenuto per scelta PO.

## 2. Tipo acciaio (ridotto allo scope)
| campo | chi | note |
|-------|-----|------|
| Tipo | [OP] | SOLO: C.A. (barre) oppure RETE elettrosaldata. Niente C.A.P./carpenteria/micropali/altro |

## 3. Corpo — prelievi (BLOCCHI DINAMICI, con "+")
> Il template reale aveva 5 blocchi BARRE, ma il numero NON è fisso: prevedere
> un pulsante "+" per AGGIUNGERE blocchi (e rimuoverli). Tipicamente 3 (i 3
> saggi/diametri del controllo), ma variabile.

Struttura "ACCIAIO DA C.A." con, per ciascun BLOCCO (= un saggio/diametro):
| campo | chi | K2 (form) | Kerios (lettura) |
|-------|-----|-----------|------------------|
| Ø mm (diametro) | [OP] | campo LIBERO (vedi dominio §2.3-bis) | lettura |
| N° spezzoni | [OP] | numero | lettura |
| Lunghezza ml | [OP] | numero (ml) | lettura |
| Colata | [OP] | testo (attributo del saggio) | lettura |
| Identificativo | [OP] | testo (marchio/sigla saggio) | lettura |

> Mappa al modello SaggioAcciaio (dominio-ntc.md §2.4): aggiungere i campi
> nSpezzoni e lunghezzaMl. Colata = attributo del singolo saggio (confermato).
> Per la RETE: gestire il diametro come maglia (es. Ø6-15x15) e la verifica
> aggiuntiva distacco nodo (a livello controllo, non di compilazione campo).

## 4. Note
| campo | chi | note |
|-------|-----|------|
| Note | [OP] | testo libero |

## 5. Chiusura — dichiarazione e firme
Dicitura fissa: "Il presente verbale viene redatto in unica copia. Letto
approvato e sottoscritto."

Tabella "Presenti al prelievo" — Nome e Cognome + Firma, per i ruoli:
- L'incaricato Impresa Esecutrice
- Per il Contraente Generale
- Per la Direzione Lavori (×2)
- Per l'Alta Sorveglianza
- Per il Laboratorio

| campo | chi | K2 | Kerios |
|-------|-----|----|--------|
| Nome e cognome (per ruolo) | [OP][SB] | testo, proposto per recenza | lettura |
| Firma (per ruolo) | [OP] | canvas → immagine | immagine (ricostruita) |

Visti finali (firma "per visto", non al prelievo):
- Visto: Il Direttore di Lotto
- Visto: Il Direttore dei Lavori (es. Ing. Biagio Marra — configurabile)

> Le firme dei presenti si acquisiscono in K2 (canvas). I VISTI del DL/Direttore
> di Lotto sono spazi che il DL firma DOPO (in Kerios o su carta): coerente col
> principio "il verbale porta sempre lo spazio per il visto DL".

## Note per il bot (K2)
- Promemoria vincoli norma (vedi flusso-campo-acciaio.md): 3 diametri diversi,
  30 t, 30 giorni. Non bloccante.
- Blocchi barre con "+": il bot guida "aggiungi un altro diametro?" finché
  l'operatore ha inserito i saggi del prelievo.
- Firme dei presenti: il bot arriva al passo firme alla fine, una per ruolo.
