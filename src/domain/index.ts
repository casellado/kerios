/**
 * `domain/` — engine NTC 2018, TypeScript PURO e deterministico.
 *
 * VUOTO di logica in M0 per scelta: l'engine (validitaPrelievo, controlloTipoA/B,
 * acciaio, ...) è la milestone M1 e nasce CON i suoi test (docs/dominio-ntc.md).
 * Qui non si calcola nulla finché non c'è il test che lo verifica (CLAUDE.md §2).
 *
 * I tipi di dominio condivisi con K2 vivranno in `core/`; quelli interni
 * all'engine qui. La struttura dei file (cls.ts, acciaio.ts, stats.ts, tipi.ts)
 * verrà proposta all'apertura di M1 (CLAUDE.md: proporre la struttura prima dei
 * file grandi).
 */

/** Marcatore di modulo presente (rimosso quando arriva l'engine M1). */
export const DOMAIN_PRONTO_PER_M1 = true;
