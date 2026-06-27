/**
 * Engine NTC 2018 — CALCESTRUZZO (§ 11.2.4 – 11.2.5). TS PURO e deterministico.
 *
 * Implementa ESATTAMENTE docs/dominio-ntc.md (tolleranza zero: è un atto legale).
 * Le soglie vengono da `Soglie` (un solo punto, soglie.ts), mai hardcoded sparse.
 *
 * Regola decimali: le VERIFICHE di soglia usano la precisione piena (come Excel,
 * che decide su valori interi a precisione macchina e mostra 2 decimali). I valori
 * di OUTPUT vengono arrotondati per il display (decimaliDisplay, default 2).
 * UNICA eccezione: lo scarto% di validità è arrotondato a 2 PRIMA del confronto,
 * perché il documento del PO lo definisce così (e neutralizza il trap 0,2·100).
 */
import {
  type Prelievo,
  type StatoPrelievo,
  type EsitoValidita,
  type RisultatoControllo,
  type Disuguaglianza,
  type Soglie,
  SOGLIE_DEFAULT,
} from '../core/index.ts';
import { media, scartoQuadraticoMedio, arrotonda } from './stats.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Ciclo di vita
// ─────────────────────────────────────────────────────────────────────────────

/** Stato derivato dai campi presenti (non un campo digitato). §1.0. */
export function statoPrelievo(p: Prelievo): StatoPrelievo {
  if (p.r1 != null && p.r2 != null && p.certificato) return 'refertato';
  if (p.lettera || p.dataRichiesta) return 'trasmesso';
  return 'verbale';
}

export function refertato(p: Prelievo): boolean {
  return statoPrelievo(p) === 'refertato';
}

// ─────────────────────────────────────────────────────────────────────────────
// Resistenza di prelievo Rc = media(R1, R2)
// ─────────────────────────────────────────────────────────────────────────────

export function resistenzaPrelievo(r1: number, r2: number): number;
export function resistenzaPrelievo(p: Prelievo): number | undefined;
export function resistenzaPrelievo(a: number | Prelievo, b?: number): number | undefined {
  if (typeof a === 'number') return (a + (b as number)) / 2;
  if (a.r1 == null || a.r2 == null) return undefined; // non refertato → non calcolabile
  return (a.r1 + a.r2) / 2;
}

/** Le Rc dei soli prelievi refertati, a precisione piena, nell'ordine del registro. */
function resistenzeRefertate(prelievi: readonly Prelievo[]): number[] {
  const out: number[] = [];
  for (const p of prelievi) {
    const rc = resistenzaPrelievo(p);
    if (rc != null) out.push(rc);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validità del prelievo (§ 11.2.4)
// ─────────────────────────────────────────────────────────────────────────────

/** scarto% = (Rmax−Rmin)/Rmin·100, arrotondato a 2; valido se ≤ scartoMaxPct (20). */
export function validitaPrelievo(
  r1: number,
  r2: number,
  soglie: Soglie = SOGLIE_DEFAULT,
): EsitoValidita {
  const rmin = Math.min(r1, r2);
  const rmax = Math.max(r1, r2);
  if (rmin <= 0) return { scartoPct: Infinity, valido: false };
  const scartoPct = arrotonda(((rmax - rmin) / rmin) * 100, 2);
  return { scartoPct, valido: scartoPct <= soglie.cls.validitaPrelievo.scartoMaxPct };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers di gruppo
// ─────────────────────────────────────────────────────────────────────────────

function miscelaOmogenea(prelievi: readonly Prelievo[]): boolean {
  const mix = new Set(prelievi.map((p) => p.mix));
  return mix.size <= 1;
}

/** Rck di progetto del gruppo (il primo). Se differiscono, lo segnala il chiamante. */
function rckGruppo(prelievi: readonly Prelievo[]): number {
  return prelievi[0]?.rck ?? Number.NaN;
}

function avvisiComuni(prelievi: readonly Prelievo[], soglie: Soglie): string[] {
  const avvisi: string[] = [];
  if (!miscelaOmogenea(prelievi))
    avvisi.push('Mix non omogeneo: il controllo mescola miscele diverse.');
  const rckDistinti = new Set(prelievi.map((p) => p.rck));
  if (rckDistinti.size > 1) avvisi.push('Rck di progetto non uniformi nel gruppo.');
  const volumi = prelievi.map((p) => p.volumeGetto).filter((v): v is number => v != null);
  if (volumi.length === prelievi.length && volumi.length > 0) {
    const somma = volumi.reduce((a, b) => a + b, 0);
    if (somma > soglie.cls.volumeTipoA.maxM3) {
      avvisi.push(
        `Tipo A: superato il limite di ${soglie.cls.volumeTipoA.maxM3} m³ (somma ${arrotonda(somma)} m³).`,
      );
    }
  }
  return avvisi;
}

function disug(richiesto: number, valore: number, decimali: number): Disuguaglianza {
  return {
    richiesto: arrotonda(richiesto, decimali),
    valore: arrotonda(valore, decimali),
    ok: valore >= richiesto,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controllo TIPO A (§ 11.2.5.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface OpzioniControllo {
  soglie?: Soglie;
  forzato?: boolean;
}

export function controlloTipoA(
  prelievi: readonly Prelievo[],
  opts: OpzioniControllo = {},
): RisultatoControllo {
  const soglie = opts.soglie ?? SOGLIE_DEFAULT;
  const d = soglie.cls.tipoA;
  const dec = soglie.decimaliDisplay;
  const rc = resistenzeRefertate(prelievi);
  const n = rc.length;
  const rck = rckGruppo(prelievi);

  const rcm28 = media(rc);
  const rcmin = n > 0 ? Math.min(...rc) : Number.NaN;
  const rckEff = Math.min(rcmin + d.deltaRcmin, rcm28 - d.deltaRcm);

  const disug1 = disug(rck + d.deltaRcm, rcm28, dec);
  const disug2 = disug(rck - d.deltaRcmin, rcmin, dec);

  const avvisi = avvisiComuni(prelievi, soglie);
  if (n < 3) avvisi.push(`Tipo A richiede almeno 3 prelievi (refertati: ${n}).`);
  if (n >= soglie.cls.nPrelieviTipoB)
    avvisi.push(`Con n ≥ ${soglie.cls.nPrelieviTipoB} valutare il Tipo B (statistico).`);

  return {
    tipo: 'A',
    n,
    rck,
    rcm28: arrotonda(rcm28, dec),
    rcmin: arrotonda(rcmin, dec),
    rckEffettiva: arrotonda(rckEff, dec),
    disug1,
    disug2,
    conforme: n >= 3 && disug1.ok && disug2.ok,
    forzato: opts.forzato ?? false,
    avvisi,
    miscelaOmogenea: miscelaOmogenea(prelievi),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controllo TIPO B (§ 11.2.5.2) — motore condiviso col Tipo A + parte statistica
// ─────────────────────────────────────────────────────────────────────────────

export interface EsitoStatisticoB {
  disug1: Disuguaglianza;
  disug2: Disuguaglianza;
  cv: number;
  conforme: boolean;
  avvisi: string[];
}

/**
 * Valutazione Tipo B sugli AGGREGATI (media, minimo, s). Esposta per testare il
 * caso documentato con i numeri esatti (media 53,1; min 50,4; s 9; Rck 40).
 */
export function valutaTipoB(
  rcm: number,
  rcmin: number,
  s: number,
  rck: number,
  soglie: Soglie = SOGLIE_DEFAULT,
): EsitoStatisticoB {
  const t = soglie.cls.tipoB;
  const dec = soglie.decimaliDisplay;
  const cv = s / rcm;

  const disug1 = disug(rck + t.fattoreS * s, rcm, dec);
  const disug2 = disug(rck - t.deltaRcmin, rcmin, dec);

  const avvisi: string[] = [];
  const cvRifiutato = cv > t.cvRifiuto;
  if (cvRifiutato) {
    avvisi.push(
      `CV ${arrotonda(cv, 3)} > ${t.cvRifiuto}: calcestruzzo NON accettabile (dispersione eccessiva).`,
    );
  } else if (cv > t.cvAvviso) {
    avvisi.push(
      `CV ${arrotonda(cv, 3)} > ${t.cvAvviso}: servono controlli più accurati (prove complementari).`,
    );
  }

  return {
    disug1,
    disug2,
    cv: arrotonda(cv, 3),
    conforme: disug1.ok && disug2.ok && !cvRifiutato,
    avvisi,
  };
}

export function controlloTipoB(
  prelievi: readonly Prelievo[],
  opts: OpzioniControllo = {},
): RisultatoControllo {
  const soglie = opts.soglie ?? SOGLIE_DEFAULT;
  const dec = soglie.decimaliDisplay;
  const rc = resistenzeRefertate(prelievi);
  const n = rc.length;
  const rck = rckGruppo(prelievi);

  const rcm28 = media(rc);
  const rcmin = n > 0 ? Math.min(...rc) : Number.NaN;
  const s = scartoQuadraticoMedio(rc);

  const est = valutaTipoB(rcm28, rcmin, s, rck, soglie);

  const avvisi = [...avvisiComuni(prelievi, soglie), ...est.avvisi];
  if (n < soglie.cls.nPrelieviTipoB) {
    avvisi.push(`Tipo B richiede n ≥ ${soglie.cls.nPrelieviTipoB} (refertati: ${n}).`);
  }

  return {
    tipo: 'B',
    n,
    rck,
    rcm28: arrotonda(rcm28, dec),
    rcmin: arrotonda(rcmin, dec),
    // rckEffettiva resta undefined per il Tipo B (decisione CTO).
    s: arrotonda(s, dec),
    cv: est.cv,
    disug1: est.disug1,
    disug2: est.disug2,
    conforme: est.conforme,
    forzato: opts.forzato ?? false,
    avvisi,
    miscelaOmogenea: miscelaOmogenea(prelievi),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Selezione del tipo di controllo (§ 1.5) — mai "a memoria"
// ─────────────────────────────────────────────────────────────────────────────

export interface SuggerimentoTipo {
  tipo: 'A' | 'B';
  motivo: string;
}

/** Sceglie A/B da volume getto + n prelievi, con motivazione esplicita. */
export function suggerisciTipoControllo(
  prelievi: readonly Prelievo[],
  volumeMc?: number,
  soglie: Soglie = SOGLIE_DEFAULT,
): SuggerimentoTipo {
  const n = prelievi.length;
  const limVol = soglie.cls.volumeTipoBObbligatorio;
  const limN = soglie.cls.nPrelieviTipoB;

  if (volumeMc != null && volumeMc > limVol) {
    return {
      tipo: 'B',
      motivo: `Volume miscela ${arrotonda(volumeMc)} m³ > ${limVol} m³ → Tipo B (statistico) obbligatorio.`,
    };
  }
  if (n >= limN) {
    return { tipo: 'B', motivo: `n = ${n} ≥ ${limN} prelievi → Tipo B applicabile.` };
  }
  return { tipo: 'A', motivo: `3 ≤ n < ${limN} e volume ≤ ${limVol} m³ → Tipo A.` };
}
