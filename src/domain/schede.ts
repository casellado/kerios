/**
 * Logica delle SCHEDE di export ST36 (dominio PURO, testabile). La UI fa solo
 * selezione/spostamento; qui vivono i pacchetti-da-6, i vincoli e gli invarianti.
 *
 * Solo i controlli COMPLETI (esito ≠ 'incompleto') entrano in scheda: gli aperti
 * sono ancora in lavorazione. MAX 6 controlli per scheda (= 6 terzine ST36).
 */
import { MAX_CONTROLLI_SCHEDA, type ControlloSalvato, type SchedaExport } from '../core/index.ts';

/** Solo i controlli completi (esito ≠ 'incompleto'): quelli che vanno in scheda. */
export function controlliCompleti(controlli: readonly ControlloSalvato[]): ControlloSalvato[] {
  return controlli.filter((c) => c.esito !== 'incompleto');
}

/** Partiziona per chiave preservando l'ordine di prima comparsa. */
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

export interface OpzioniSchede {
  maxPerScheda?: number;
  /** true (default): raggruppa per WBS/opera prima di spezzare a ≤max. */
  perWbs?: boolean;
}

/**
 * Raggruppa i controlli COMPLETI in schede da ≤ max (default 6). Con `perWbs`
 * (default true) tiene insieme la stessa opera/WBS, poi spezza a ≤max. Numerazione
 * progressiva 1..N; id deterministico `scheda-<numero>` (stabile per i test).
 */
export function raggruppaInSchede(
  controlli: readonly ControlloSalvato[],
  opts: OpzioniSchede = {},
): SchedaExport[] {
  const max = opts.maxPerScheda ?? MAX_CONTROLLI_SCHEDA;
  const completi = controlliCompleti(controlli);
  const gruppi = opts.perWbs === false ? [completi] : partiziona(completi, (c) => c.wbs);
  const schede: SchedaExport[] = [];
  let numero = 0;
  for (const g of gruppi) {
    for (let i = 0; i < g.length; i += max) {
      numero += 1;
      const chunk = g.slice(i, i + max);
      const wbs = chunk[0]?.wbs;
      schede.push({
        id: `scheda-${numero}`,
        numero,
        ...(wbs ? { wbs } : {}),
        controlliIds: chunk.map((c) => c.id),
        esportato: false,
      });
    }
  }
  return schede;
}

export interface EsitoSposta {
  schede: SchedaExport[];
  /** messaggio se lo spostamento NON è stato applicato (es. scheda piena). */
  errore?: string;
}

/**
 * Sposta un controllo in una scheda: rispetta i vincoli (≤max; un controllo in
 * UNA sola scheda → lo rimuove dall'origine). Immutabile: ritorna nuove schede.
 * Se la destinazione è piena, NON applica e ritorna un errore.
 */
export function spostaControllo(
  schede: readonly SchedaExport[],
  controlloId: string,
  schedaDestId: string,
  max = MAX_CONTROLLI_SCHEDA,
): EsitoSposta {
  const dest = schede.find((s) => s.id === schedaDestId);
  if (!dest) return { schede: [...schede], errore: 'Scheda di destinazione inesistente.' };
  if (dest.controlliIds.includes(controlloId)) return { schede: [...schede] }; // già lì
  if (dest.controlliIds.length >= max) {
    return { schede: [...schede], errore: `Scheda ${dest.numero} piena (max ${max}).` };
  }
  const next = schede.map((s) => {
    if (s.id === schedaDestId) return { ...s, controlliIds: [...s.controlliIds, controlloId] };
    if (s.controlliIds.includes(controlloId)) {
      return { ...s, controlliIds: s.controlliIds.filter((x) => x !== controlloId) };
    }
    return s;
  });
  return { schede: next };
}

export interface ProblemiSchede {
  /** completi non presenti in alcuna scheda (dimenticati). */
  dimenticati: string[];
  /** controlloId presente in più di una scheda (doppioni). */
  doppioni: string[];
  /** id in scheda che non corrispondono a un controllo completo esistente (orfani). */
  orfani: string[];
  ok: boolean;
}

/**
 * INVARIANTE "ogni completo in esattamente UNA scheda, niente doppioni, niente
 * dimenticati". Ritorna i problemi (vuoti = ok). `orfani` = id in scheda non più
 * tra i completi (controllo modificato/eliminato → id cambiato).
 */
export function validaSchede(
  controlli: readonly ControlloSalvato[],
  schede: readonly SchedaExport[],
): ProblemiSchede {
  const completiIds = new Set(controlliCompleti(controlli).map((c) => c.id));
  const conta = new Map<string, number>();
  for (const s of schede) for (const id of s.controlliIds) conta.set(id, (conta.get(id) ?? 0) + 1);
  const doppioni = [...conta].filter(([, n]) => n > 1).map(([id]) => id);
  const inSchede = new Set(conta.keys());
  const dimenticati = [...completiIds].filter((id) => !inSchede.has(id));
  const orfani = [...inSchede].filter((id) => !completiIds.has(id));
  return {
    dimenticati,
    doppioni,
    orfani,
    ok: dimenticati.length === 0 && doppioni.length === 0 && orfani.length === 0,
  };
}

/**
 * Schede STALE = puntano a controlliIds non più esistenti (id per-contenuto: un
 * controllo modificato dopo l'export cambia id → la scheda è "da riesportare").
 */
export function schedeStale(
  schede: readonly SchedaExport[],
  controlliEsistentiIds: ReadonlySet<string>,
): SchedaExport[] {
  return schede.filter((s) => s.controlliIds.some((id) => !controlliEsistentiIds.has(id)));
}
