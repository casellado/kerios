/**
 * Mappatura DATI del documento ST36 ACCIAIO (condivisa: anteprima ed export .xlsx).
 *
 * L'ST36 acciaio ha 1 RIGA PER PRELIEVO (niente terzine). Ogni misura (fy/Agt/
 * ft·fy) ha 3 saggi, ma il documento espone UNA cella per misura: si scrive il
 * valore CRITICO (decisione CTO), mentre l'ESITO è calcolato dall'engine su TUTTI
 * e tre i saggi (soglie complete B450C). Engine INVARIATO (riusa domain/acciaio).
 */
import type { PrelievoAcciaio, SoglieAcciaio, Terna } from '../core/index.ts';
import { esitiPrelievoAcciaio, type EsitoParam } from '../domain/index.ts';

/** Una riga prelievo dell'ST36 acciaio (valori critici + 4 esiti calcolati). */
export interface RigaST36Acciaio {
  verbale: string;
  data: string;
  diametro: number | null;
  produttore: string;
  ubicazione: string;
  denominazione: string;
  laboratorio: string;
  certificato: string;
  dataProva: string;
  fy: number | null; // MIN dei 3 saggi (cautelativo lato resistenza)
  agt: number | null; // MIN dei 3 saggi (la soglia è un minimo)
  ftfy: number | null; // valore più SFAVOREVOLE vs 1,13–1,37
  piega: string;
  esitoFy: EsitoParam; // esito su TUTTI e 3 i saggi (rigoroso)
  esitoAgt: EsitoParam;
  esitoFtfy: EsitoParam;
  esitoPiega: EsitoParam;
}

export interface DocumentoST36Acciaio {
  opera?: string;
  righe: RigaST36Acciaio[];
}

const finiti = (t: Terna): number[] => t.filter((v) => Number.isFinite(v));

const minTerna = (t: Terna): number | null => {
  const f = finiti(t);
  return f.length ? Math.min(...f) : null;
};

/** ft/fy critico: il valore più vicino a USCIRE da [1,13; 1,37] (o il minimo se tutti dentro). */
function ftfyCritico(t: Terna): number | null {
  const f = finiti(t);
  if (!f.length) return null;
  const mn = Math.min(...f);
  const mx = Math.max(...f);
  if (mn < 1.13) return mn;
  if (mx > 1.37) return mx;
  return mn;
}

/** Mappa un prelievo → riga ST36 (valore critico in cella, esito su tutti e 3). */
export function mappaPrelievoST36Acciaio(
  p: PrelievoAcciaio,
  soglie?: SoglieAcciaio,
): RigaST36Acciaio {
  const e = esitiPrelievoAcciaio(p, soglie);
  return {
    verbale: p.verbale,
    data: p.data ?? '',
    diametro: Number.isFinite(p.diametro) ? p.diametro : null,
    produttore: p.produttore ?? '',
    ubicazione: p.ubicazione ?? p.parte ?? '',
    denominazione: p.denominazione ?? '',
    laboratorio: p.laboratorio ?? '',
    certificato: p.certificato ?? '',
    dataProva: p.dataProva ?? '',
    fy: minTerna(p.fy),
    agt: minTerna(p.agt),
    ftfy: ftfyCritico(p.ftfy),
    piega: p.piega ?? '',
    esitoFy: e.fy,
    esitoAgt: e.agt,
    esitoFtfy: e.ftfy,
    esitoPiega: e.piega,
  };
}

/** Mappa i prelievi di una scheda → documento (opera derivata dai prelievi). */
export function mappaSchedaST36Acciaio(
  prelievi: readonly PrelievoAcciaio[],
  soglie?: SoglieAcciaio,
): DocumentoST36Acciaio {
  const opere = [...new Set(prelievi.map((p) => p.opera?.trim()).filter(Boolean))] as string[];
  return {
    ...(opere.length === 1 ? { opera: opere[0] } : {}),
    righe: prelievi.map((p) => mappaPrelievoST36Acciaio(p, soglie)),
  };
}
