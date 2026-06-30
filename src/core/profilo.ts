/**
 * Profilo commessa — intestazione di cantiere (vedi docs/profilo-commessa.md).
 *
 * DECISIONE PO: NON campi separati (committente/CUP/CIG…) ma uno SPAZIO di TESTO
 * LIBERO multi-riga: l'utente scrive la testata come vuole (es. "S.S. n.106
 * Jonica" / "Lavori di costruzione del 3° Megalotto…"). Il testo libero si adatta
 * a qualunque cantiere; i campi rigidi sarebbero una gabbia. Condiviso K2↔Kerios.
 */
export const SCHEMA_PROFILO = 'kerios-profilo-commessa/1';

export interface ProfiloCommessa {
  schema: typeof SCHEMA_PROFILO;
  /** Nome della commessa (= nome cartella). */
  commessa: string;
  /** Intestazione del cantiere a TESTO LIBERO (multi-riga, rispetta gli a-capo). */
  intestazione?: string;
  /** Direttore dei Lavori (SOLO nome, una riga, es. "Ing. Biagio Marra"). Dato
   *  LOCALE della commessa: compare nella firma del documento ST36, non nel software. */
  direttoreLavori?: string;
}
