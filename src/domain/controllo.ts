/**
 * Calcolo di un controllo di accettazione su un gruppo CONFERMATO di prelievi.
 * TS PURO. NON riscrive l'engine: orchestra M1 (suggerisciTipoControllo +
 * controlloTipoA/B). Sceglie il tipo coi dati (volume + n), l'utente può forzarlo.
 */
import {
  type Prelievo,
  type Soglie,
  type RisultatoControllo,
  SOGLIE_DEFAULT,
} from '../core/index.ts';
import {
  controlloTipoA,
  controlloTipoB,
  suggerisciTipoControllo,
  type SuggerimentoTipo,
} from './cls.ts';

export interface EsitoControllo {
  /** tipo proposto dalla norma, con motivazione (mai default silenzioso). */
  suggerimento: SuggerimentoTipo;
  /** tipo effettivamente applicato (= suggerito, salvo forzatura dell'utente). */
  tipoApplicato: 'A' | 'B';
  risultato: RisultatoControllo;
}

export interface OpzioniCalcolo {
  soglie?: Soglie;
  /** volume della miscela omogenea (per la selezione A/B), se noto. */
  volumeMc?: number;
  /** forza il tipo (tracciato come forzatura dell'utente). */
  tipo?: 'A' | 'B';
  /** l'utente conferma nonostante gli avvisi. */
  forzato?: boolean;
}

export function calcolaControllo(
  prelievi: readonly Prelievo[],
  opts: OpzioniCalcolo = {},
): EsitoControllo {
  const soglie = opts.soglie ?? SOGLIE_DEFAULT;
  const suggerimento = suggerisciTipoControllo(prelievi, opts.volumeMc, soglie);
  const tipoApplicato = opts.tipo ?? suggerimento.tipo;
  const optEngine = { soglie, forzato: opts.forzato ?? false };
  const risultato =
    tipoApplicato === 'B'
      ? controlloTipoB(prelievi, optEngine)
      : controlloTipoA(prelievi, optEngine);
  return { suggerimento, tipoApplicato, risultato };
}
