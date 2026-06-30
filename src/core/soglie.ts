/**
 * SOGLIE — configurazione esterna delle regole (docs/dominio-ntc.md §1.4-octies).
 *
 * Le soglie NON sono hardcoded sparse nel codice: vivono in UN SOLO posto
 * (`SOGLIE_DEFAULT`). I valori NTC di legge (3,5 / 1,48 / 0,15 / 0,30 / 20%)
 * restano quelli normativi; il JSON serve a non duplicarli e ad adattare i
 * diagnostici, NON a indebolire le verifiche. `caricaSoglie` fonde un eventuale
 * JSON esterno (modificabile dall'utente, M2) SOPRA i default, in modo tollerante.
 */

export interface SoglieCls {
  validitaPrelievo: { scartoMaxPct: number };
  tipoA: { deltaRcm: number; deltaRcmin: number };
  tipoB: {
    fattoreS: number;
    deltaRcmin: number;
    cvAvviso: number;
    cvRifiuto: number;
  };
  /** limite "miscela omogenea" oltre cui il Tipo B è obbligatorio (m³). */
  volumeTipoBObbligatorio: number;
  /** n prelievi minimo per un controllo Tipo A completo (NTC). */
  nPrelieviTipoAMin: number;
  /** n prelievi minimo per applicare il Tipo B. */
  nPrelieviTipoB: number;
  massaVolumica: { min: number; max: number };
  volumeTipoA: { maxM3: number };
  trasporto: { maxMinuti: number };
  stagionatura: { canonicoGg: number; limiteGg: number };
  slumpClassi: Record<string, [number, number]>;
  /** semaforo PRELIMINARE: banda gialla = Rc sotto Rck ma entro questo margine. */
  preliminare: { margineGiallo: number };
}

export interface Soglie {
  cls: SoglieCls;
  /** Blocco acciaio — rifinito in M7. Tipizzato largo per ora. */
  acciaio?: Record<string, unknown>;
  /** Decimali per i valori MOSTRATI (Excel/certificati lavorano a 2). */
  decimaliDisplay: number;
}

export const SOGLIE_DEFAULT: Soglie = {
  cls: {
    validitaPrelievo: { scartoMaxPct: 20 },
    tipoA: { deltaRcm: 3.5, deltaRcmin: 3.5 },
    tipoB: { fattoreS: 1.48, deltaRcmin: 3.5, cvAvviso: 0.15, cvRifiuto: 0.3 },
    volumeTipoBObbligatorio: 1500,
    nPrelieviTipoAMin: 3,
    nPrelieviTipoB: 15,
    massaVolumica: { min: 2200, max: 2500 },
    volumeTipoA: { maxM3: 300 },
    trasporto: { maxMinuti: 90 },
    stagionatura: { canonicoGg: 28, limiteGg: 45 },
    slumpClassi: {
      S1: [10, 40],
      S2: [50, 90],
      S3: [100, 150],
      S4: [160, 210],
      S5: [220, 999],
    },
    preliminare: { margineGiallo: 3.5 },
  },
  decimaliDisplay: 2,
};

/**
 * Soglie ACCIAIO B450C in cantiere (NTC 2018 §11.3.2.12) — DECISE PO+CTO.
 * Valori COMPLETI (limite inf. E sup.): il template ST36 controlla solo il
 * superiore di fy/ftfy → l'engine Kerios applica le soglie piene (più corretto).
 */
export interface SoglieAcciaio {
  fyMin: number; // N/mm²
  fyMax: number;
  agtMin: number; // %
  ftfyMin: number;
  ftfyMax: number;
}

export const SOGLIE_ACCIAIO: SoglieAcciaio = {
  fyMin: 425,
  fyMax: 572,
  agtMin: 6,
  ftfyMin: 1.13,
  ftfyMax: 1.37,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Fonde ricorsivamente `patch` sopra `base` (solo oggetti semplici; array/scalari sostituiti). */
function fondi<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch) || !isPlainObject(base)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? fondi(out[k], v) : v;
  }
  return out as T;
}

/**
 * Carica le soglie da un JSON esterno arbitrario, fondendolo sopra i default.
 * Tollerante: chiavi assenti restano ai default; non lancia su input parziali.
 */
export function caricaSoglie(json: unknown): Soglie {
  return fondi(SOGLIE_DEFAULT, json);
}
