/**
 * Engine ACCIAIO B450C (NTC 2018 §11.3.2) — TS PURO, deterministico.
 *
 * Verifica le soglie COMPLETE per saggio (fy, Agt, ft/fy) + prova di piega, e
 * aggrega l'esito del prelievo. Niente terzine, niente media, niente Rck eff: il
 * controllo acciaio è più lineare del cls. ZERO import dal dominio cls.
 *
 * Gli esiti sono CALCOLATI qui (soglie piene), MAI importati dal registro (le cui
 * formule Excel sono parziali). Un valore mancante/non finito → 'incompleto'
 * (neutro), non 'Negativo': il prelievo non ancora refertato non è una bocciatura.
 */
import type { PrelievoAcciaio, Terna } from '../core/index.ts';
import { SOGLIE_ACCIAIO, type SoglieAcciaio } from '../core/index.ts';

export type EsitoParam = 'Positivo' | 'Negativo' | 'incompleto';

const dentro = (v: number, min: number, max: number): boolean => v >= min && v <= max;

/** Esito di UN parametro su una terna di saggi: Positivo se TUTTI i 3 finiti e in range. */
function esitoTerna(valori: Terna, ok: (v: number) => boolean): EsitoParam {
  if (valori.some((v) => !Number.isFinite(v))) return 'incompleto';
  return valori.every(ok) ? 'Positivo' : 'Negativo';
}

/** Normalizza l'esito della prova di piega dal certificato. */
export function esitoPiega(piega: string | undefined): EsitoParam {
  const v = (piega ?? '').trim().toLowerCase();
  if (v === '') return 'incompleto';
  // "Positivo", "P", "F" (favorevole), "ok", "assenza cricche" → positivo
  if (/^(positiv|p$|f$|ok|favor|assenza)/.test(v)) return 'Positivo';
  return 'Negativo';
}

export interface EsitiPrelievoAcciaio {
  fy: EsitoParam;
  agt: EsitoParam;
  ftfy: EsitoParam;
  piega: EsitoParam;
  /** aggregato: Positivo solo se TUTTI i parametri Positivi; incompleto se manca un dato. */
  controllo: EsitoParam;
}

/** Esiti per i 4 parametri del prelievo + aggregato (soglie complete). */
export function esitiPrelievoAcciaio(
  p: PrelievoAcciaio,
  soglie: SoglieAcciaio = SOGLIE_ACCIAIO,
): EsitiPrelievoAcciaio {
  const fy = esitoTerna(p.fy, (v) => dentro(v, soglie.fyMin, soglie.fyMax));
  const agt = esitoTerna(p.agt, (v) => v >= soglie.agtMin);
  const ftfy = esitoTerna(p.ftfy, (v) => dentro(v, soglie.ftfyMin, soglie.ftfyMax));
  const piega = esitoPiega(p.piega);
  const tutti = [fy, agt, ftfy, piega];
  const controllo: EsitoParam = tutti.includes('incompleto')
    ? 'incompleto'
    : tutti.every((e) => e === 'Positivo')
      ? 'Positivo'
      : 'Negativo';
  return { fy, agt, ftfy, piega, controllo };
}

/**
 * Raggruppa i prelievi acciaio per (WBS, Ø, produttore) — discriminante acciaio
 * (≠ mix del cls). Il "ogni 30 t" e la formazione del controllo arrivano nella
 * fase controllo; qui basta il raggruppamento che alimenta il registro.
 */
export interface GruppoAcciaio {
  wbs: string;
  diametro: number;
  produttore: string;
  prelievi: PrelievoAcciaio[];
}

const chiaveGruppo = (p: PrelievoAcciaio): string =>
  `${p.wbs}|Ø${p.diametro}|${p.produttore.trim().toUpperCase()}`;

export function raggruppaAcciaio(prelievi: readonly PrelievoAcciaio[]): GruppoAcciaio[] {
  const buckets = new Map<string, PrelievoAcciaio[]>();
  for (const p of prelievi) {
    const k = chiaveGruppo(p);
    const b = buckets.get(k);
    if (b) b.push(p);
    else buckets.set(k, [p]);
  }
  return [...buckets.values()].map((arr) => {
    const primo = arr[0]!;
    return {
      wbs: primo.wbs,
      diametro: primo.diametro,
      produttore: primo.produttore,
      prelievi: arr,
    };
  });
}
