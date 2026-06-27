/**
 * Formati italiani (CLAUDE.md §4). I decimali hanno la VIRGOLA: in ingresso si
 * converte virgola→punto SOLO internamente per i calcoli; in uscita si torna a
 * virgola per l'utente.
 */

/** "23,3" → 23.3 ; "" / non numerico → undefined. Tollera spazi e segno. */
export function parseNumeroIt(s: string | undefined | null): number | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 23.7 → "23,7". Con `decimali` fissa le cifre (es. 2 → "23,70"); senza, mostra
 * il numero così com'è con la virgola. undefined/NaN → stringa vuota.
 */
export function formattaNumeroIt(x: number | undefined | null, decimali?: number): string {
  if (x == null || !Number.isFinite(x)) return '';
  const s = decimali != null ? x.toFixed(decimali) : String(x);
  return s.replace('.', ',');
}
