/**
 * Raggruppamento dei prelievi in proposte di controllo (§1.4-quater). TS PURO.
 *
 * PRINCIPIO CARDINE (filosofia-kerios.md): la strategia PROPONE, l'utente DISPONE.
 * Qui si producono SOLO proposte (`ProtostaControllo`) editabili; il motore NTC
 * (controlloTipoA/B) è IGNARO della strategia. Nessun verdetto automatico.
 *
 * Solo i prelievi REFERTATI entrano in un controllo (gli altri non hanno R).
 */
import {
  type Prelievo,
  type ProtostaControllo,
  type ModoRaggruppamento,
  type Soglie,
  SOGLIE_DEFAULT,
} from '../core/index.ts';
import { refertato, stagionatura } from './cls.ts';
import { parseDataIt } from './date.ts';

/** Spezza in terzine consecutive; l'ultimo gruppo parziale (<3) è mantenuto (come l'Excel). */
function terzine<T>(arr: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 3) out.push(arr.slice(i, i + 3));
  return out;
}

/** Partiziona per chiave preservando l'ordine di prima comparsa (e l'ordine interno). */
function partiziona<T>(arr: readonly T[], chiave: (x: T) => string): T[][] {
  const buckets = new Map<string, T[]>();
  for (const x of arr) {
    const k = chiave(x);
    const b = buckets.get(k);
    if (b) b.push(x);
    else buckets.set(k, [x]);
  }
  return [...buckets.values()];
}

/** Avvisi di COMPOSIZIONE del gruppo (non bloccanti). Il controllo aggiunge n<3/CV. */
export function avvisiGruppo(
  prelievi: readonly Prelievo[],
  soglie: Soglie = SOGLIE_DEFAULT,
): string[] {
  const avvisi: string[] = [];
  if (new Set(prelievi.map((p) => p.mix)).size > 1) {
    avvisi.push('Mix non omogeneo: il gruppo mescola miscele diverse.');
  }
  if (new Set(prelievi.map((p) => p.parte)).size > 1) {
    avvisi.push("Parti d'opera eterogenee nel gruppo.");
  }
  const volumi = prelievi.map((p) => p.volumeGetto).filter((v): v is number => v != null);
  if (volumi.length === prelievi.length && volumi.length > 0) {
    const somma = volumi.reduce((a, b) => a + b, 0);
    if (somma > soglie.cls.volumeTipoA.maxM3) {
      avvisi.push(`Volume cumulato ${somma} m³ > ${soglie.cls.volumeTipoA.maxM3} m³.`);
    }
  }
  if (
    prelievi.some((p) => (stagionatura(p, soglie).giorni ?? 0) > soglie.cls.stagionatura.limiteGg)
  ) {
    avvisi.push(`Prove oltre ${soglie.cls.stagionatura.limiteGg} gg dal getto nel gruppo.`);
  }
  return avvisi;
}

function protosta(prelievi: readonly Prelievo[], soglie: Soglie): ProtostaControllo {
  return { prelieviIds: prelievi.map((p) => p.id), avvisi: avvisiGruppo(prelievi, soglie) };
}

/** Chiave temporale per ordinare (data verbale/getto). Date assenti in fondo. */
function chiaveData(p: Prelievo): number {
  return parseDataIt(p.data) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Produce proposte di gruppi secondo la strategia. EDITABILI dall'utente.
 *  - 'auto': terzine consecutive nell'ordine dato (replica il metodo Excel).
 *  - 'assistito': raggruppa per mix + parte d'opera, ordina per vicinanza
 *    temporale, poi terzine. L'utente conferma/ritocca.
 *  - 'manuale': nessuna proposta (l'utente compone liberamente).
 */
export function raggruppa(
  prelievi: readonly Prelievo[],
  modo: ModoRaggruppamento,
  soglie: Soglie = SOGLIE_DEFAULT,
): ProtostaControllo[] {
  const refert = prelievi.filter(refertato);

  if (modo === 'manuale') return [];

  if (modo === 'auto') {
    // MISCELA OMOGENEA (NTC §11.2.5): si raggruppa SOLO entro lo stesso mix design
    // (che codifica resistenza+esposizione+consistenza). Prima partiziona per mix,
    // poi terzine consecutive nell'ordine del registro DENTRO ciascun mix.
    const out: ProtostaControllo[] = [];
    for (const arr of partiziona(refert, (p) => p.mix)) {
      for (const g of terzine(arr)) out.push(protosta(g, soglie));
    }
    return out;
  }

  // 'assistito': bucket primario il MIX, poi parte d'opera; ordina per data, poi terzine.
  const out: ProtostaControllo[] = [];
  for (const arr of partiziona(refert, (p) => `${p.mix}||${p.parte}`)) {
    const ordinati = [...arr].sort((a, b) => chiaveData(a) - chiaveData(b));
    for (const g of terzine(ordinati)) out.push(protosta(g, soglie));
  }
  return out;
}

/** Esito della verifica di MISCELA OMOGENEA su un gruppo (per il banner FORTE). */
export interface AvvisoOmogeneita {
  omogenea: boolean;
  /** true quando NON è omogenea: avviso forte (mix diversi). */
  forte: boolean;
  /** true se differisce anche l'Rck (caso più grave). */
  rckDiversi: boolean;
  messaggio: string;
}

/**
 * Verifica che il gruppo sia una MISCELA OMOGENEA ai sensi NTC §11.2.5: stesso
 * MIX DESIGN (che racchiude resistenza + esposizione + consistenza). Mix diversi
 * → avviso FORTE (non bloccante, superabile con `forzato`). Distingue "solo mix
 * diverso" da "Rck e mix diversi" (più grave).
 */
export function verificaOmogeneita(prelievi: readonly Prelievo[]): AvvisoOmogeneita {
  const mixDistinti = new Set(prelievi.map((p) => p.mix)).size;
  const rckDistinti = new Set(prelievi.map((p) => p.rck)).size;
  if (mixDistinti <= 1) {
    return { omogenea: true, forte: false, rckDiversi: false, messaggio: '' };
  }
  const rckDiversi = rckDistinti > 1;
  const cosa = rckDiversi ? 'Rck e mix diversi' : 'Miscele (mix) diverse';
  return {
    omogenea: false,
    forte: true,
    rckDiversi,
    messaggio: `${cosa}: non è una miscela omogenea ai sensi NTC §11.2.5. Confermi comunque?`,
  };
}
