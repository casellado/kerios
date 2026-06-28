/**
 * Calcolo di un controllo di accettazione su un gruppo CONFERMATO di prelievi.
 * TS PURO. NON riscrive l'engine: orchestra M1 (suggerisciTipoControllo +
 * controlloTipoA/B). Sceglie il tipo coi dati (volume + n), l'utente può forzarlo.
 */
import {
  type Prelievo,
  type Soglie,
  type RisultatoControllo,
  type ControlloSalvato,
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

/**
 * Un controllo è COMPLETO se ha il numero minimo di prelievi del suo tipo:
 * Tipo A ≥ 3 (NTC), Tipo B ≥ 15. Un gruppo sotto il minimo NON è un controllo
 * valido (resto/orfano): non gli si attribuisce un esito di conformità.
 */
export function controlloCompleto(r: RisultatoControllo, soglie: Soglie = SOGLIE_DEFAULT): boolean {
  const min = r.tipo === 'B' ? soglie.cls.nPrelieviTipoB : soglie.cls.nPrelieviTipoAMin;
  return r.n >= min;
}

export interface OpzioniSnapshot extends OpzioniCalcolo {
  generato: string; // ISO (passato da fuori: il dominio non legge l'orologio)
}

/**
 * CHIAVE per CONTENUTO di un controllo: deterministica e indipendente dall'ordine
 * dei prelievi (join degli id ORDINATI). Stesso insieme di prelievi → stessa
 * chiave, anche tra sessioni o dopo una rigenerazione della proposta. Così il
 * salvataggio è idempotente per CONTENUTO, non per un uid di sessione (fix
 * "Controlli salvati" doppi). Niente hashing/dipendenze: la chiave è l'insieme
 * stesso (esatta, senza rischio di collisione).
 */
export function chiaveControllo(prelieviIds: readonly string[]): string {
  return [...prelieviIds].sort().join('|');
}

/**
 * Costruisce lo SNAPSHOT salvabile di un controllo dai SUOI prelievi. Cattura i
 * VALORI calcolati (non riferimenti): `prelieviIds` è una COPIA e tutti i campi
 * sono primitivi del controllo. Un gruppo incompleto (n sotto il minimo) ha
 * esito 'incompleto', mai 'conforme'/'non_conforme' (P2 del collaudo).
 * La CHIAVE (`id`) è derivata dai prelievi → idempotenza per contenuto.
 */
export function costruisciControlloSalvato(
  prelievi: readonly Prelievo[],
  opts: OpzioniSnapshot,
): ControlloSalvato {
  const soglie = opts.soglie ?? SOGLIE_DEFAULT;
  const { risultato: r } = calcolaControllo(prelievi, opts);
  const completo = controlloCompleto(r, soglie);
  const prelieviIds = prelievi.map((p) => p.id); // SNAPSHOT (copia), non il riferimento di stato

  const c: ControlloSalvato = {
    id: chiaveControllo(prelieviIds),
    wbs: prelievi[0]?.wbs ?? '',
    tipo: r.tipo,
    rck: r.rck,
    prelieviIds,
    esito: !completo ? 'incompleto' : r.conforme ? 'conforme' : 'non_conforme',
    n: r.n,
    forzato: opts.forzato ?? false,
    generato: opts.generato,
  };
  const mix = prelievi[0]?.mix;
  if (mix) c.mix = mix;
  if (r.rckEffettiva != null) c.rckEffettiva = r.rckEffettiva;
  return c;
}
