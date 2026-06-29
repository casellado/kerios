/**
 * Sigle di verbale/cartellino (docs/numerazione-cuore.md). In `core/` perché
 * condivise (Kerios, K2, Cuore). TS PURO.
 *
 * Display SEMPRE con "/" (`CLS/1`, `AC1/1 A`); il nome-file NON può contenere "/".
 * L'IMPORT deve riconoscere sia il formato NUOVO (`CLS/1`, slash) sia lo STORICO
 * (`CLS 5607` con spazio, `AC1-0001` con trattino e zeri), per non perdere i
 * ~35.000 verbali in archivio.
 */

export interface SiglaParsed {
  prefisso: string; // "CLS", "AC1"
  numero: number; // senza zeri di riempimento
  display: string; // forma canonica "CLS/1"
}

/** Verbale: prefisso + "/" + progressivo → `CLS/1`. */
export function formattaSiglaVerbale(prefisso: string, n: number): string {
  return `${prefisso}/${n}`;
}

/** Cartellino/cubetto: numero verbale + spazio + lettera → `CLS/1 A`. */
export function formattaSiglaCartellino(verbale: string, lettera: string): string {
  return `${verbale} ${lettera}`;
}

/** Forma sicura per il filesystem: niente "/" né spazi → `CLS/1 A` ⇒ `CLS-1-A`. */
export function siglaToNomeFile(sigla: string): string {
  return sigla
    .trim()
    .replace(/[/\s]+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Riconosce una sigla di verbale in formato NUOVO o STORICO e la normalizza.
 * Accetta separatore "/", spazio o "-" e zeri di riempimento. Restituisce null
 * se non interpretabile (il chiamante conserva comunque la stringa grezza).
 *   "CLS/12"    → { CLS, 12, "CLS/12" }
 *   "CLS 5607"  → { CLS, 5607, "CLS/5607" }
 *   "AC1-0001"  → { AC1, 1, "AC1/1" }
 */
export function parseSiglaImport(str: string): SiglaParsed | null {
  const m = /^\s*([A-Za-z]+\d*)\s*[/\- ]\s*0*(\d+)\s*$/.exec(str);
  if (!m) return null;
  const prefisso = m[1].toUpperCase();
  const numero = Number(m[2]);
  if (!Number.isFinite(numero)) return null;
  return { prefisso, numero, display: formattaSiglaVerbale(prefisso, numero) };
}

/**
 * Materiale ricavato dal numero di verbale (discriminante NATURALE, non
 * euristica). Distinto da `Materiale` (contratto.ts) perché include 'sconosciuto'.
 */
export type MaterialeVerbale = 'cls' | 'acciaio' | 'sconosciuto';

/** Prefisso → materiale: UN SOLO posto che sa cosa significa "CLS"/"AC1". */
const PREFISSO_MATERIALE: Readonly<Record<string, MaterialeVerbale>> = {
  CLS: 'cls',
  AC1: 'acciaio',
};

/**
 * Dal numero di verbale ricava il MATERIALE dal PREFISSO (CLS → calcestruzzo,
 * AC1 → acciaio, altro → sconosciuto). Pura, riusabile da import, modulo acciaio
 * e Themis. Il significato dei prefissi vive QUI nel Cuore, non sparso nell'io.
 */
export function materialeDaVerbale(verbale: string): MaterialeVerbale {
  const prefisso = parseSiglaImport(verbale)?.prefisso;
  return (prefisso && PREFISSO_MATERIALE[prefisso]) || 'sconosciuto';
}

/** true se il verbale è di CALCESTRUZZO (prefisso CLS). */
export function eVerbaleCls(verbale: string): boolean {
  return materialeDaVerbale(verbale) === 'cls';
}
