/**
 * Date in formato italiano `gg/mm/aaaa` (anche `gg/mm/aa`). TS PURO.
 * Si lavora in UTC (Date.UTC) per evitare derive da fuso orario: il calcolo dei
 * giorni dev'essere deterministico (è la base degli avvisi 28/45 gg).
 */

/** Millisecondi UTC a mezzanotte della data `gg/mm/aaaa`, o null se non valida. */
export function parseDataIt(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/.exec(s);
  if (!m) return null;
  const g = Number(m[1]);
  const mese = Number(m[2]);
  let anno = Number(m[3]);
  if (anno < 100) anno += 2000; // "23" → 2023 (storico acciaio a 2 cifre)
  if (mese < 1 || mese > 12 || g < 1 || g > 31) return null;
  const ms = Date.UTC(anno, mese - 1, g);
  const d = new Date(ms);
  // rifiuta date "rotolate" (es. 31/02 → 03/03)
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== g) {
    return null;
  }
  return ms;
}

const MS_GIORNO = 86_400_000;

/** Giorni interi tra due date `gg/mm/aaaa` (b − a), o null se una non è valida. */
export function giorniTra(a: string | undefined, b: string | undefined): number | null {
  const ma = parseDataIt(a);
  const mb = parseDataIt(b);
  if (ma == null || mb == null) return null;
  return Math.round((mb - ma) / MS_GIORNO);
}
