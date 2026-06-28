/**
 * Scheda di export ST36 — raggruppa i controlli COMPLETI in "fogli" da MAX 6,
 * prima dell'export .docx (passo successivo). ENTITÀ (non un campo sul controllo):
 * la membership è `controlliIds` (single source) → invariante "un controllo in UNA
 * sola scheda, niente doppioni" verificabile sulla lista. Condiviso (core).
 */
export const MAX_CONTROLLI_SCHEDA = 6;

export interface SchedaExport {
  /** id stabile della scheda (per persistenza/spostamenti). */
  id: string;
  /** numero progressivo (1..N) per l'utente. */
  numero: number;
  /** WBS/opera della scheda (le schede automatiche sono per WBS). */
  wbs?: string;
  /** id dei ControlloSalvato inclusi (≤ MAX_CONTROLLI_SCHEDA). */
  controlliIds: string[];
  /** true quando il documento è stato esportato. */
  esportato: boolean;
  /** ISO della data di export (se esportato). */
  esportatoIl?: string;
  /** nome-file del .docx generato (export = passo successivo). */
  fileDocx?: string;
}
