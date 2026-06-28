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

/** Chiave di partizione: GERARCHIA 1° WBS (l'opera) → 2° MIX design (NTC §11.2.5).
 *  Stesso mix in OPERE diverse (WBS) = controlli separati (non si fondono opere);
 *  i residui si accorpano SOLO entro (WBS, mix). Con registro mono-WBS è identico
 *  al solo mix (una WBS per file). */
function chiaveWbsMix(p: Prelievo): string {
  return `${p.wbs}||${p.mix}`;
}

/**
 * Produce proposte di gruppi secondo la strategia. EDITABILI dall'utente.
 * GERARCHIA (PO+CTO, norma+pratica): WBS (opera) → mix (miscela omogenea) →
 * terzine + UN residuo aperto per (WBS, mix).
 *  - 'auto': terzine consecutive nell'ordine del registro, dentro (WBS, mix).
 *  - 'assistito': terzine complete per parte d'opera + vicinanza temporale, ma i
 *    RESIDUI si accorpano per (WBS, mix) — non si spezzano per parte.
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
    // Partiziona per (WBS, mix), poi terzine consecutive nell'ordine del registro.
    const out: ProtostaControllo[] = [];
    for (const arr of partiziona(refert, chiaveWbsMix)) {
      for (const g of terzine(arr)) out.push(protosta(g, soglie));
    }
    return out;
  }

  // 'assistito': bucket primario (WBS, mix); DENTRO, sotto-raggruppa per parte
  // d'opera (prima comparsa) e per data, poi appiattisci e spezza in terzine →
  // le terzine complete restano coese per parte/tempo, ma c'è UN SOLO residuo
  // aperto per (WBS, mix) (fix collaudo: 7106+7223 stesso mix, parti diverse →
  // un controllo aperto, non due da 1). L'avviso "parti eterogenee" resta.
  const out: ProtostaControllo[] = [];
  for (const arr of partiziona(refert, chiaveWbsMix)) {
    const ordinati = partiziona(arr, (p) => p.parte)
      .map((bucket) => [...bucket].sort((a, b) => chiaveData(a) - chiaveData(b)))
      .flat();
    for (const g of terzine(ordinati)) out.push(protosta(g, soglie));
  }
  return out;
}

export interface OpzioniCompatibilita {
  /** mix del controllo (solo questo mix è compatibile); undefined = nessun vincolo di mix. */
  mix: string | undefined;
  /** id già impegnati altrove (no media mobile) → esclusi. */
  esclusi: ReadonlySet<string>;
  /** date (ms) dei prelievi già nel gruppo, per ordinare per vicinanza temporale. */
  dateRiferimento: readonly number[];
}

/**
 * Prelievi COMPATIBILI con un controllo (menu "aggiungi", §1.4-quater-bis/ter):
 * stesso mix, NON già assegnati (no media mobile), ordinati per VICINANZA
 * TEMPORALE ai prelievi del gruppo (o per data se il gruppo è vuoto). Pura.
 */
export function prelieviCompatibili(
  refertati: readonly Prelievo[],
  opts: OpzioniCompatibilita,
): Prelievo[] {
  const dist = (p: Prelievo): number => {
    const d = parseDataIt(p.data);
    if (d == null) return Number.MAX_SAFE_INTEGER;
    if (opts.dateRiferimento.length === 0) return d;
    return Math.min(...opts.dateRiferimento.map((x) => Math.abs(x - d)));
  };
  return refertati
    .filter((p) => !opts.esclusi.has(p.id) && (opts.mix == null || p.mix === opts.mix))
    .sort((a, b) => dist(a) - dist(b));
}

/** Riga del GUARDRAIL per mix: quanti controlli Tipo A si chiudono e cosa manca. */
export interface RigaGuardrail {
  mix: string;
  nRefertati: number;
  terzineComplete: number; // controlli Tipo A completabili (3 prelievi)
  restoAperto: number; // prelievi nel controllo aperto residuo (0..2)
  prelieviMancanti: number; // per chiudere l'aperto (multipli di 3 → 0)
  cubettiMancanti: number; // prelieviMancanti · 2
}

/**
 * GUARDRAIL cubetti/prelievi per MIX (§1.4-quater-ter). Informativo, non bloccante:
 * per ogni miscela omogenea dice quanti controlli Tipo A si chiudono e quanti
 * prelievi/cubetti mancano per chiudere l'eventuale controllo aperto. Scopo:
 * avvisare PRIMA della fine lavori (certificati per la Relazione a Strutture Ultimate).
 * Conta solo i refertati. Il minimo Tipo A (3) viene dalle soglie.
 */
export function guardrailPerMix(
  prelievi: readonly Prelievo[],
  soglie: Soglie = SOGLIE_DEFAULT,
): RigaGuardrail[] {
  const min = soglie.cls.nPrelieviTipoAMin; // 3
  const out: RigaGuardrail[] = [];
  for (const arr of partiziona(prelievi.filter(refertato), (p) => p.mix)) {
    const n = arr.length;
    const restoAperto = n % min;
    const prelieviMancanti = restoAperto === 0 ? 0 : min - restoAperto;
    out.push({
      mix: arr[0]?.mix ?? '',
      nRefertati: n,
      terzineComplete: Math.floor(n / min),
      restoAperto,
      prelieviMancanti,
      cubettiMancanti: prelieviMancanti * 2,
    });
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
