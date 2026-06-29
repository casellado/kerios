/**
 * Mappatura DATI del documento ST36 (condivisa: anteprima ed export .xlsx).
 *
 * Da un controllo salvato + i suoi prelievi produce le righe ST36 con i VALORI
 * NUMERICI (l'xlsx applica i formati numerici Excel; foglio "morto", numeri
 * congelati, NON formule). Engine INVARIATO: ricalcolo DETERMINISTICO con
 * l'engine (stesse formule della vista), forzando `tipo: ctrl.tipo`.
 */
import type { ControlloSalvato, Prelievo, Soglie } from '../core/index.ts';
import { calcolaControllo, descriviPrelievo, resistenzaPrelievo } from '../domain/index.ts';

/** Controllo + i suoi prelievi risolti (dallo store / cache). */
export interface ControlloPerDoc {
  ctrl: ControlloSalvato;
  prelievi: Prelievo[];
}

/** Una riga prelievo dell'ST36. Numeri = valori (con numFmt in Excel); '' / null = vuoto. */
export interface RigaST36 {
  data: string;
  rck: number | null;
  verbale: string;
  ubicazione: string; // = parte (campo UNICO Kerios)
  denominazione: string; // VUOTA (l'utente la completa in Excel)
  laboratorio: string;
  certificato: string;
  dataProva: string;
  rottGg: number | null;
  r1: number | null;
  r2: number | null;
  r: number | null;
}

/** Un controllo pronto per il documento: righe + valori terzina (numerici). */
export interface ControlloST36 {
  tipo: 'A' | 'B';
  esito: ControlloSalvato['esito']; // per il semaforo verde/rosso sulla Rck eff
  opera?: string;
  righe: RigaST36[];
  rmin: number | null;
  rm: number | null;
  rckEff: number | null;
}

const num = (x: number | undefined): number | null => (x == null || Number.isNaN(x) ? null : x);

/** Mappa un controllo (+ prelievi) → struttura ST36 (engine invariato). */
export function mappaControlloST36(cd: ControlloPerDoc, soglie: Soglie): ControlloST36 {
  const r = calcolaControllo(cd.prelievi, { soglie, tipo: cd.ctrl.tipo }).risultato;
  const righe: RigaST36[] = cd.prelievi.map((p) => {
    const vp = descriviPrelievo(p, soglie);
    return {
      data: p.data ?? '',
      rck: num(p.rck),
      verbale: p.verbale,
      ubicazione: p.parte ?? '',
      denominazione: '',
      laboratorio: p.laboratorio ?? '',
      certificato: p.certificato ?? '',
      dataProva: p.dataProva ?? '',
      rottGg: vp.stagionaturaGg ?? null,
      r1: num(p.r1),
      r2: num(p.r2),
      r: num(resistenzaPrelievo(p)),
    };
  });
  return {
    tipo: cd.ctrl.tipo,
    esito: cd.ctrl.esito,
    ...(cd.ctrl.opera ? { opera: cd.ctrl.opera } : {}),
    righe,
    rmin: num(r.rcmin),
    rm: num(r.rcm28),
    rckEff: num(r.rckEffettiva),
  };
}
