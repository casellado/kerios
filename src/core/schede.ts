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
  /** nome-file dell'.xlsx ST36 generato (es. ST36_<wbs>_scheda<numero>.xlsx). */
  fileXlsx?: string;
}

/**
 * Scheda di export ST36 ACCIAIO — gemella della cls ma riferita ai PRELIEVI (non a
 * controlli): l'ST36 acciaio ha 1 riga per prelievo, fino a 18 (R7..R24). Store
 * separato `schedeAcciaio` (decisione CTO: moduli paralleli, zero rischio sul cls).
 */
export const MAX_PRELIEVI_SCHEDA_ACCIAIO = 18;

export interface SchedaExportAcciaio {
  id: string;
  numero: number;
  /** WBS della scheda (le schede automatiche sono per WBS+Ø+produttore). */
  wbs?: string;
  /** id dei PrelievoAcciaio inclusi (≤ MAX_PRELIEVI_SCHEDA_ACCIAIO). */
  prelieviIds: string[];
  esportato: boolean;
  esportatoIl?: string;
  fileXlsx?: string;
}
