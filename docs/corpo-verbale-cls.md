# Corpo del verbale di prelievo — CALCESTRUZZO (specifica per Code)

> Ricavato dal verbale reale ANAS del PO (modello S.S.534, multi-foglio).
> È il contenuto del {corpo_html} iniettato nel template (vedi verbali-template.md).
> Header template (a destra): DATA prelievo + SIGLA con numero verbale.
> Per ogni campo: CHI lo riempie + come appare in K2 (form) e Kerios (lettura).
> Legenda: [CUORE] dal Cuore | [OP] operatore in K2 | [SB] second brain | [AUTO].

## MODELLO MENTALE: il template è la CARTA, l'HTML ci scrive sopra
Il template .docx è la cornice di qualità (logo, codice/versione modulo, header
ripetuto) con UN segnaposto `{corpo_html}`. TUTTO il layout dettagliato del corpo
(riquadri, sezioni, tabelle provini, firme) vive DENTRO il `{corpo_html}`, che
Code costruisce e "scrive sopra" la carta-template.

## LAYOUT FEDELE (qualità interna) — requisito
Il corpo NON è solo "quali campi": deve RIPRODURRE FEDELMENTE la struttura/layout
del verbale reale di riferimento (reference/verbali/verbale_cls_reale.xls),
sezione per sezione, per riconoscibilità e qualità interna. Code costruisce il
layout nel `{corpo_html}`; il PO lo VALIDA in collaudo (flusso-orchestra) finché
non è identico nella struttura al verbale reale. I riferimenti a un committente
specifico (es. ANAS) NON vanno cablati: sono configurabili (profilo commessa),
perché un domani può essere RFI o altri.

## 0. Intestazione di commessa (in testa al corpo)
Vedi docs/profilo-commessa.md. Dal profilo progetto, NON dato di verbale:
committente, descrizione lavori, numero contratto (+ data rep.), impresa,
stazione appaltante, CUP, CIG, Direttore dei Lavori. Compare prima di tutto.
> Conferma dal verbale ANAS: in testa ci sono committente (ANAS), descrizione
> lavori, contratto n. + data di repertorio, impresa.

## 1. Materiale e luogo
| campo | chi | note |
|-------|-----|------|
| Materiale | [OP] | SOLO CALCESTRUZZO (scope PO). Il modello ANAS prevedeva anche MALTA/BOIACCA: fuori scope salvo decisione futura |
| Numero verbale + sigla | [CUORE] | CLS/n (vedi numerazione-cuore.md) |
| Data prelievo | [OP] | gg/mm/aaaa |
| Luogo di prelievo | [OP] | scelta: IMPIANTO / GETTO / ALTRO |
| WBS + Descrizione | [OP][SB] | proposti per recenza |
| Parte d'opera + Progressiva prelievo | [OP][SB] | |

## 2. Dati generali (ruoli)
| campo | chi | note |
|-------|-----|------|
| Direttore dei Lavori | [SB] | dal profilo/recenza |
| Incaricato al prelievo | [OP][SB] | |
| Incaricato Impresa al prelievo | [OP][SB] | |

## 3. Dati dal Documento di Trasporto (DDT)
| campo | chi | note |
|-------|-----|------|
| DDT n° | [OP] | |
| MIX | [OP][SB] | il mix design; SB propone il mix abituale per opera/WBS |
| Targa autobetoniera | [OP] | |
| Classe di resistenza (fck/Rck) | [OP][SB] | es. C28/35 → Rck 35 |
| Getto con uso di pompa | [OP] | SI / NO |
| Classi di esposizione | [OP][SB] | es. XC2, XF1... |
| Fornitore | [OP][SB] | |
| Impianto | [OP][SB] | |

## 4. Dati prelievo
| campo | chi | note |
|-------|-----|------|
| Ora prelievo | [OP] | |
| Prelievo effettuato da | [OP] | Direttore Lavori / Delegato D.L. / Lab. Autorizzato |
| Temperatura ambiente | [OP] | °C |
| Temperatura CLS | [OP] | °C |
| Tipo casseforme | [OP] | PVC / Acciaio / Polistirolo / Altro |
| Slump test (mm) | [OP] | valore dell'ultima prova ACCETTATA (lo slump-test è preliminare e fuori K2; qui si riporta il valore buono). Rif. UNI EN 12350-2 |

## 5. PROVINI (cartellini) — elenco DINAMICO, default 4, +/−
> CHIARIMENTO NORMATIVO (verificato): gerarchia = PROVINO (cubetto) → PRELIEVO
> (2 provini, la cui media = "resistenza di prelievo") → CONTROLLO (più prelievi).
> Nel VERBALE di campo si registrano i PROVINI fisici. L'accoppiamento in
> prelievi e il calcolo avvengono nel MOTORE DI CONTROLLO (già esistente, NON
> modificato).
- Le **lettere A, B, C, D, ...** identificano i **PROVINI** dentro il verbale.
- Sigla cartellino: numero verbale + spazio + lettera → CLS/1 A, CLS/1 B, ...
- **Default 4 provini**, ma:
  - **"+" aggiungi UNO alla volta** (possono essere DISPARI — il PO lo conferma:
    non forzare le coppie in compilazione);
  - **"−" rimuovi** (per errori di compilazione — utile).
- Per ciascun provino: lettera (auto), eventuali note del singolo (opzionale).
> K2 NON forza il numero pari. Il vincolo "2 provini = 1 prelievo" è del controllo
> di accettazione, non della compilazione del verbale.

## 6. Note
Testo libero. La dicitura fissa sui sigilli/conservazione provini (UNI-EN
12390-2) è un **testo predefinito CONFIGURABILE per progetto** (parte del profilo
commessa): ogni committente ha le sue (ANAS, RFI, ...). NON cablare diciture di
un committente specifico. Default modificabile + note libere.

## 7. Dati confezionamento (diagnostici, FLAG/selezioni)
> Sono SELEZIONI da spuntare (non testo libero), tranne i conteggi numerici.
| campo | tipo | opzioni |
|-------|------|---------|
| Tipo di assestamento | flag (scelta) | Vibratore interno (120Hz) / Tavola vibrante (40Hz) / Pestello acciaio Ø16mm / SCC autocompattante |
| Condizioni di maturazione | flag (scelta) | in cantiere / in laboratorio / al fornitore |
| Dimensioni cubettiere | flag (scelta) | 15x15x15 / 10x10x10 |
| n° prelievi / cubetti / cilindri | numero | derivabili dall'elenco provini |
| n° al laboratorio | numero | quanti provini vanno al laboratorio |
> Diagnostici: registrati nel verbale, NON entrano nelle disuguaglianze normative.

## 8. Chiusura — dichiarazione e firme
Dicitura fissa: "Il presente verbale viene redatto in unica copia. Letto
approvato e sottoscritto."
Tabella "Presenti al prelievo" — Nome e Cognome + Firma, ruoli:
- L'incaricato Impresa Esecutrice
- Per la Direzione Lavori
- Per il Subappaltatore
- Per il Fornitore
- Per il Laboratorio
| campo | chi | K2 | Kerios |
|-------|-----|----|--------|
| Nome e cognome (per ruolo) | [OP][SB] | testo, proposto | lettura |
| Firma (per ruolo) | [OP] | canvas → immagine | immagine ricostruita |

Visto finale: "Visto: Il Direttore dei Lavori" + nome (dal profilo) — firmato
DOPO (in Kerios o su carta), coerente col principio "spazio per il visto DL".

## Pagina 2 (opzionale, prove di laboratorio estese)
Il modello ANAS ha una seconda pagina con prove approfondite (granulometria,
contenuto d'aria, cloruri, solfati, prove su boiacca, ecc.). FUORI dallo scope
base (è scheda di laboratorio, non verbale di prelievo). Prevedibile come
estensione futura, non in M-iniziale.

## Note per il bot (K2)
- Lo slump-test è preliminare e fuori K2 (vedi flusso-campo-cls.md): qui si
  registra solo il valore accettato.
- Provini: il bot guida "aggiungi provino?" (default 4, +/− uno alla volta),
  genera la sigla CLS/n + lettera per ciascuno.
- Firme dei presenti alla fine, una per ruolo.
