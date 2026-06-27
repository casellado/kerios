/**
 * Helper statistici e numerici per l'engine NTC. TS PURO, deterministico.
 *
 * Punto critico (docs/dominio-ntc.md §1.4): lo scarto quadratico medio del Tipo B
 * usa il denominatore **n−1** (campionario, = DEV.ST.C di Excel), NON n.
 */

/** Media aritmetica. Su array vuoto → NaN (caller gestisce). */
export function media(valori: readonly number[]): number {
  if (valori.length === 0) return Number.NaN;
  return valori.reduce((a, b) => a + b, 0) / valori.length;
}

/**
 * Scarto quadratico medio CAMPIONARIO (denominatore n−1).
 * Richiede n ≥ 2; con n < 2 restituisce NaN (la varianza campionaria non è definita).
 */
export function scartoQuadraticoMedio(valori: readonly number[]): number {
  const n = valori.length;
  if (n < 2) return Number.NaN;
  const m = media(valori);
  const sommaScarti2 = valori.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(sommaScarti2 / (n - 1));
}

/**
 * Arrotonda a `decimali` cifre (default 2). Solo per i valori MOSTRATI / di output
 * (Excel e certificati lavorano a 2 decimali). Le verifiche di soglia usano la
 * precisione piena, tranne dove esplicitamente indicato (scarto% di validità).
 * Il +EPSILON neutralizza i casi tipo 2,675 → 2,68.
 */
export function arrotonda(x: number, decimali = 2): number {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** decimali;
  return Math.round((x + Number.EPSILON) * f) / f;
}
