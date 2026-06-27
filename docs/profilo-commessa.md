# Profilo commessa — intestazione di progetto (configurabile)

> Principio guida del PO: "questo software non si esaurisce con il Megalotto ma
> potrà avere vita propria indipendentemente". Quindi NIENTE dato di commessa
> cablato nel template o nel codice: tutto CONFIGURABILE per progetto.

## Cos'è
Un blocco di dati della COMMESSA, impostato UNA VOLTA alla creazione del progetto
in Kerios, che compare automaticamente IN TESTA AL CORPO di ogni verbale (cls e
acciaio) — e, se utile, anche sui documenti di controllo.
NON va nel template .docx (che resta cornice di qualità stabile): va nel
{corpo_html}, all'inizio. NON è un dato del singolo verbale: è configurazione di
progetto, riusata su tutti i verbali di quella commessa.

## Campi (tutti opzionali; presenti se valorizzati)
| campo | esempio |
|-------|---------|
| descrizione_lavori | "LAVORI DI COSTRUZIONE 3° MEGALOTTO DELLA S.S. 106 JONICA DA INNESTO CON LA S.S. 534 (KM 365+150) A ROSETO CAPO SPULICO (KM 400+000)" |
| numero_contratto | (numero del contratto d'appalto) |
| committente | (es. ANAS S.p.A.) |
| stazione_appaltante | (ente appaltante) |
| cup | Codice Unico di Progetto |
| cig | Codice Identificativo Gara |
| direttore_lavori | nominativo DL (richiesto dalla norma sui documenti di prelievo) |

> Set tipico di una commessa pubblica italiana. Conferma normativa: i documenti
> di prelievo/certificati devono identificare committente, cantiere/opera e il
> nominativo del Direttore dei Lavori (NTC 2018 / prassi). Il PO valorizza ciò
> che usa; i campi vuoti non compaiono nel verbale. Estendibile.

## Dove vive e come si usa
- **Profilo progetto** in Kerios: si imposta una volta per commessa (parte delle
  impostazioni di progetto, insieme a cartella di lavoro, logo, ecc.).
- **In testa al corpo verbale**: K2 e Kerios pescano il profilo e lo mettono
  all'inizio del {corpo_html}, sopra i dati del prelievo.
- **Condiviso** tra Kerios e K2 via kerios-core (come il resto del formato): K2
  deve conoscere il profilo per stampare l'intestazione nei verbali di campo.

## Implicazione architetturale (coerente col resto)
- Conferma il principio "Kerios multi-commessa": nessun dato di opera cablato.
- Si collega ai codici opachi del Cuore: il Cuore vede "OPERA-7", il profilo
  commessa (lato Kerios) sa che OPERA-7 = questa descrizione/contratto. La mappa
  resta SOLO lato utente, mai sul Cuore (coerente con numerazione-cuore.md).

## Nota per Code
È configurazione di PROGETTO, non campo di verbale. Si imposta in un punto solo
(profilo progetto) e si riusa ovunque serva l'intestazione. Mai chiedere questi
dati a ogni verbale.
