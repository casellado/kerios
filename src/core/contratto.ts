/**
 * CONTRATTO JSON K2 ↔ Kerios — il cuore del sistema.
 *
 * Fonte: docs/contratto-json-k2-kerios.md. PRIORITÀ ASSOLUTA del PO: lo schema
 * con cui K2 (chi CREA) produce il verbale e Kerios (chi LEGGE/RICOSTRUISCE) lo
 * importa. Vive in questo modulo `core/` perché è CONDIVISO e dev'essere
 * ESTRAIBILE in `kerios-core` (M11) senza riscrivere: K2 e Kerios importano gli
 * STESSI tipi, così il formato non può divergere.
 *
 * NOTA M0: questa è la bozza versionata v1.0 (lo scheletro). I campi di dettaglio
 * (testata, ddt, datiPrelievo, ...) verranno rifiniti e VALIDATI dal PO nelle
 * milestone del corpo verbale; la forma esterna (versionato, autosufficiente,
 * materiale esplicito, firme come immagini) è già quella definitiva del contratto.
 */

/** Versione corrente dello schema del verbale. Ogni JSON la porta sempre. */
export const SCHEMA_VERSION = '1.0' as const;

export type Materiale = 'cls' | 'acciaio';

/** Firma acquisita in K2 (canvas → PNG). MAI testo, MAI riferimenti esterni. */
export interface FirmaPresente {
  ruolo: string;
  nome: string;
  /** data URL PNG (base64) incorporato nel JSON. */
  firmaPng: string;
}

/** Allegato referenziato dal verbale (DDT cls; doc trasporto/colate acciaio). */
export interface AllegatoRif {
  tipo: 'DDT' | 'colata' | 'doc_trasporto' | 'certificato' | string;
  nomeFile?: string;
  rif?: string;
}

/** Stato firma del verbale: 'firmato' abilita la tracciatura delle correzioni. */
export type StatoFirma = 'bozza' | 'firmato';

/**
 * Voce di changelog di una correzione POST-FIRMA. Esiste SOLO sui verbali
 * firmati (confine posto dal PO), a TUTELA del DL: dimostra che una modifica è
 * avvenuta in modo trasparente. Vedi docs/correzioni-e-viste.md §4.
 */
export interface CorrezioneVerbale {
  /** percorso del campo corretto, es. "datiPrelievo.slumpMm". */
  campo: string;
  da: string;
  a: string;
  /** data della correzione, ISO `aaaa-mm-gg`. */
  data: string;
}

/**
 * Il verbale prodotto da K2. Autosufficiente: contiene tutto ciò che serve a
 * Kerios per ricostruirlo SENZA dipendere dallo stato di K2.
 *
 * I blocchi `Record<string, unknown>` sono SEGNAPOST0 tipizzati larghi: vanno
 * stretti nelle milestone del corpo verbale (corpo-verbale-cls/acciaio.md),
 * dopo validazione PO. Non sono `any`: restano serializzabili e ispezionabili.
 */
export interface VerbaleJSON {
  /** Versione schema — mai un JSON senza versione. */
  schemaVersion: string;
  /** Quale corpo/template usare lato Kerios. */
  materiale: Materiale;
  /** Numero già assegnato dal Cuore (display: "CLS/12", "AC1/3"). Kerios NON riassegna. */
  numeroVerbale: string;
  /** Codice opaco opera (la mappa opaco→opera reale vive SOLO in Kerios). */
  operaOpaca: string;
  /** Data prelievo, ISO `aaaa-mm-gg`. */
  dataPrelievo: string;

  /** Snapshot del profilo commessa al momento del verbale. */
  profiloCommessa?: Record<string, unknown>;
  testata?: Record<string, unknown>;
  datiGenerali?: Record<string, unknown>;
  /** cls: DDT del getto (n, mix, classe, fornitore, impianto, ...). */
  ddt?: Record<string, unknown>;
  datiPrelievo?: Record<string, unknown>;
  confezionamento?: Record<string, unknown>;

  /** cls: i provini/cubetti (lettere A..D). */
  provini?: Array<Record<string, unknown>>;
  /** acciaio: i saggi (vedi SaggioAcciaio, dominio §2.4). */
  saggi?: Array<Record<string, unknown>>;

  note?: string;
  /** Firme acquisite in K2 (immagini). */
  presenti?: FirmaPresente[];
  allegati?: AllegatoRif[];

  /** Stato firma. Default logico 'bozza' finché non firmato in K2. */
  statoFirma?: StatoFirma;
  /** Changelog post-firma — presente SOLO se `statoFirma === 'firmato'`. */
  correzioni?: CorrezioneVerbale[];
}
