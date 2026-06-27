import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Prelievo } from '../../core/index.ts';
import {
  validitaPrelievo,
  resistenzaPrelievo,
  controlloTipoA,
  controlloTipoB,
  scartoQuadraticoMedio,
  suggerisciTipoControllo,
  raggruppa,
  refertato,
} from '../index.ts';

/**
 * TEST BASATI SU PROPRIETÀ (fast-check). Le LEGGI della norma sono espresse in
 * modo INDIPENDENTE (invarianti, disuguaglianze, monotonìe): NON si ricalcola
 * l'atteso con la funzione testata (eviterebbe l'auto-marcatura). Se una legge
 * è violata, fast-check restituisce il controesempio minimo = un BUG.
 */

const EPS = 1e-9;
const genR = fc.integer({ min: 50, max: 900 }).map((n) => n / 10); // R ∈ [5,90], 1 dec
const genRes = fc.integer({ min: 100, max: 900 }).map((n) => n / 10); // [10,90]
const genRck = fc.constantFrom(15, 20, 25, 30, 35, 40, 45);
const RUNS = { numRuns: 1000 };

let cnt = 0;
function pr(rc: number, rck = 30, mix = 'M', parte = 'P'): Prelievo {
  cnt += 1;
  return {
    id: `p${cnt}`,
    verbale: `CLS/${cnt}`,
    data: '01/01/2024',
    wbs: 'ST11',
    parte,
    rck,
    mix,
    certificato: 'C',
    r1: rc,
    r2: rc,
  };
}
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ─────────────────────────── PRELIEVO (M2) ──────────────────────────────────
describe('Proprietà — Prelievo (validità §11.2.4)', () => {
  it('P1 — fuori dal ±20% → nullo; ben dentro → valido (confine a parte)', () => {
    fc.assert(
      fc.property(genR, genR, (a, b) => {
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        const ratio = ((max - min) / min) * 100; // legge indipendente
        const { valido } = validitaPrelievo(a, b);
        if (ratio <= 19.99) expect(valido).toBe(true);
        else if (ratio >= 20.01) expect(valido).toBe(false);
        // banda 19.99–20.01: decide l'arrotondamento → coperta dai punti fissi C2
      }),
      RUNS,
    );
  });

  it('P2 — resistenzaPrelievo è la media (R1+R2)/2', () => {
    fc.assert(
      fc.property(genR, genR, (a, b) => {
        expect(resistenzaPrelievo(a, b)).toBeCloseTo((a + b) / 2, 9);
      }),
      RUNS,
    );
  });

  it('P3 — simmetria: l’ordine R1/R2 è irrilevante', () => {
    fc.assert(
      fc.property(genR, genR, (a, b) => {
        expect(validitaPrelievo(a, b)).toEqual(validitaPrelievo(b, a));
      }),
      RUNS,
    );
  });

  it('P4 — monotonìa: a parità di min, aumentando il max lo scarto non cala', () => {
    fc.assert(
      fc.property(genR, fc.nat({ max: 800 }), fc.nat({ max: 400 }), (min, d1, d2) => {
        const lo = min;
        const max1 = lo + d1 / 10;
        const max2 = max1 + d2 / 10; // ≥ max1
        const s1 = validitaPrelievo(lo, max1).scartoPct;
        const s2 = validitaPrelievo(lo, max2).scartoPct;
        expect(s2 + EPS).toBeGreaterThanOrEqual(s1);
      }),
      RUNS,
    );
  });
});

// ─────────────────────────── TIPO A (M3) ────────────────────────────────────
describe('Proprietà — Controllo Tipo A (§11.2.5.1)', () => {
  const genGruppoA = fc.array(genRes, { minLength: 3, maxLength: 14 });

  it('A1 — conforme ⟺ (Rcm ≥ Rck+3,5) E (Rcmin ≥ Rck−3,5)', () => {
    fc.assert(
      fc.property(genGruppoA, genRck, (rc, rck) => {
        const r = controlloTipoA(rc.map((x) => pr(x, rck)));
        const m = media(rc);
        const mn = Math.min(...rc);
        const atteso = m >= rck + 3.5 && mn >= rck - 3.5;
        expect(r.conforme).toBe(atteso);
      }),
      RUNS,
    );
  });

  it('A2 — Rck_eff = MIN(Rcmin+3,5 ; Rcm−3,5) ed è il minore dei due', () => {
    fc.assert(
      fc.property(genGruppoA, genRck, (rc, rck) => {
        const r = controlloTipoA(rc.map((x) => pr(x, rck)));
        const m = media(rc);
        const mn = Math.min(...rc);
        const rckEffFull = Math.min(mn + 3.5, m - 3.5);
        // il display è il pieno arrotondato a 2 decimali → scarto ≤ 0,005 (incluso).
        // (il caso X,XX5 arrotonda half-up, come ROUND di Excel: vedi arrotonda()).
        expect(Math.abs((r.rckEffettiva ?? Number.NaN) - rckEffFull)).toBeLessThanOrEqual(
          0.005 + EPS,
        );
        expect(rckEffFull).toBeLessThanOrEqual(m - 3.5 + EPS);
        expect(rckEffFull).toBeLessThanOrEqual(mn + 3.5 + EPS);
      }),
      RUNS,
    );
  });

  it('A3 — coerenza esito ↔ Rck effettiva: conforme ⟺ Rck_eff ≥ Rck', () => {
    fc.assert(
      fc.property(genGruppoA, genRck, (rc, rck) => {
        const r = controlloTipoA(rc.map((x) => pr(x, rck)));
        const rckEffFull = Math.min(Math.min(...rc) + 3.5, media(rc) - 3.5);
        expect(r.conforme).toBe(rckEffFull >= rck);
      }),
      RUNS,
    );
  });

  it('A4 — monotonìa: aumentando una resistenza, conforme non diventa MAI non conforme', () => {
    fc.assert(
      fc.property(
        genGruppoA,
        genRck,
        fc.nat(),
        fc.integer({ min: 1, max: 300 }),
        (rc, rck, idx, dRaw) => {
          const i = idx % rc.length;
          const c1 = controlloTipoA(rc.map((x) => pr(x, rck))).conforme;
          const rc2 = [...rc];
          rc2[i] += dRaw / 10;
          const c2 = controlloTipoA(rc2.map((x) => pr(x, rck))).conforme;
          if (c1) expect(c2).toBe(true);
        },
      ),
      RUNS,
    );
  });
});

// ─────────────────────────── TIPO B (M3) ────────────────────────────────────
describe('Proprietà — Controllo Tipo B (§11.2.5.2)', () => {
  const genGruppoB = fc.array(genRes, { minLength: 15, maxLength: 40 });
  const RUNS_B = { numRuns: 400 };

  it('B1 — s è campionario (n−1): s²·(n−1) = Σ(xi−media)²', () => {
    fc.assert(
      fc.property(genGruppoB, (rc) => {
        const s = scartoQuadraticoMedio(rc);
        const m = media(rc);
        const sumSq = rc.reduce((a, x) => a + (x - m) ** 2, 0);
        expect(s * s * (rc.length - 1)).toBeCloseTo(sumSq, 6);
      }),
      RUNS_B,
    );
  });

  it('B2 — conforme ⟹ (Rcm ≥ Rck+1,48·s) E (Rcmin ≥ Rck−3,5)', () => {
    fc.assert(
      fc.property(genGruppoB, genRck, (rc, rck) => {
        const r = controlloTipoB(rc.map((x) => pr(x, rck)));
        if (r.conforme) {
          const s = scartoQuadraticoMedio(rc);
          expect(media(rc) + EPS).toBeGreaterThanOrEqual(rck + 1.48 * s);
          expect(Math.min(...rc) + EPS).toBeGreaterThanOrEqual(rck - 3.5);
        }
      }),
      RUNS_B,
    );
  });

  it('B3 — CV>0,30 ⟹ sempre non accettabile; 0,15<CV<0,30 ⟹ sempre avviso', () => {
    fc.assert(
      fc.property(genGruppoB, genRck, (rc, rck) => {
        const r = controlloTipoB(rc.map((x) => pr(x, rck)));
        const cv = scartoQuadraticoMedio(rc) / media(rc);
        if (cv > 0.3 + EPS) {
          expect(r.conforme).toBe(false);
          expect(r.avvisi.some((a) => a.includes('NON accettabile'))).toBe(true);
        } else if (cv > 0.15 + EPS && cv < 0.3 - EPS) {
          expect(r.avvisi.some((a) => a.includes('controlli più accurati'))).toBe(true);
        }
      }),
      RUNS_B,
    );
  });

  it('B4 — rckEffettiva è undefined per il Tipo B', () => {
    fc.assert(
      fc.property(genGruppoB, genRck, (rc, rck) => {
        expect(controlloTipoB(rc.map((x) => pr(x, rck))).rckEffettiva).toBeUndefined();
      }),
      { numRuns: 200 },
    );
  });
});

// ─────────────────────────── SELEZIONE A/B (M3) ─────────────────────────────
describe('Proprietà — Selezione Tipo A/B (§1.5)', () => {
  it('S1 — volume > 1500 m³ ⟹ sempre Tipo B (motivo volume)', () => {
    fc.assert(
      fc.property(
        fc.array(genRes, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1501, max: 6000 }),
        (rc, vol) => {
          const s = suggerisciTipoControllo(
            rc.map((x) => pr(x)),
            vol,
          );
          expect(s.tipo).toBe('B');
          expect(s.motivo).toContain('1500');
        },
      ),
      RUNS,
    );
  });

  it('S2 — n ≥ 15 (senza volume) ⟹ sempre Tipo B (motivo n)', () => {
    fc.assert(
      fc.property(fc.array(genRes, { minLength: 15, maxLength: 30 }), (rc) => {
        const s = suggerisciTipoControllo(rc.map((x) => pr(x)));
        expect(s.tipo).toBe('B');
        expect(s.motivo).toContain('15');
      }),
      { numRuns: 300 },
    );
  });

  it('S3 — 3≤n<15 e volume ≤1500 ⟹ Tipo A, motivo sempre presente', () => {
    fc.assert(
      fc.property(
        fc.array(genRes, { minLength: 3, maxLength: 14 }),
        fc.option(fc.integer({ min: 1, max: 1500 }), { nil: null }),
        (rc, vol) => {
          const prl = rc.map((x) => pr(x));
          const s = vol == null ? suggerisciTipoControllo(prl) : suggerisciTipoControllo(prl, vol);
          expect(s.tipo).toBe('A');
          expect(s.motivo.length).toBeGreaterThan(0);
        },
      ),
      RUNS,
    );
  });
});

// ─────────────────────────── RAGGRUPPAMENTO (M3) ────────────────────────────
describe('Proprietà — Raggruppamento (§1.4-quater)', () => {
  // lista mista refertati/non refertati, id univoci
  const genLista = fc
    .array(
      fc.record({
        rc: genRes,
        refert: fc.boolean(),
        mix: fc.constantFrom('MIX-A', 'MIX-B'),
        parte: fc.constantFrom('P1', 'P2'),
      }),
      { minLength: 0, maxLength: 20 },
    )
    .map((arr) =>
      arr.map((o, i): Prelievo => {
        const base: Prelievo = {
          id: `g${i}`,
          verbale: `CLS/${i}`,
          data: `0${(i % 9) + 1}/01/2024`,
          wbs: 'ST11',
          parte: o.parte,
          rck: 30,
          mix: o.mix,
        };
        if (o.refert) {
          base.certificato = 'C';
          base.r1 = o.rc;
          base.r2 = o.rc;
        }
        return base;
      }),
    );

  it('G1+G3 — AUTO conserva i refertati nell’ordine del registro (niente perso/inventato)', () => {
    fc.assert(
      fc.property(genLista, (lista) => {
        const refIds = lista.filter(refertato).map((p) => p.id);
        const auto = raggruppa(lista, 'auto');
        expect(auto.flatMap((g) => g.prelieviIds)).toEqual(refIds);
      }),
      RUNS,
    );
  });

  it('G1 — ASSISTITO conserva l’insieme dei refertati (stesso insieme, riordino ammesso)', () => {
    fc.assert(
      fc.property(genLista, (lista) => {
        const refIds = lista.filter(refertato).map((p) => p.id);
        const ass = raggruppa(lista, 'assistito').flatMap((g) => g.prelieviIds);
        expect(ass.length).toBe(refIds.length);
        expect(new Set(ass)).toEqual(new Set(refIds));
      }),
      RUNS,
    );
  });

  it('G2 — nessun gruppo contiene prelievi NON refertati', () => {
    fc.assert(
      fc.property(genLista, (lista) => {
        const refSet = new Set(lista.filter(refertato).map((p) => p.id));
        for (const g of [...raggruppa(lista, 'auto'), ...raggruppa(lista, 'assistito')]) {
          for (const id of g.prelieviIds) expect(refSet.has(id)).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it('G4 — ogni proposta è una struttura editabile (array di id + array avvisi)', () => {
    fc.assert(
      fc.property(genLista, (lista) => {
        for (const g of raggruppa(lista, 'auto')) {
          expect(Array.isArray(g.prelieviIds)).toBe(true);
          expect(Array.isArray(g.avvisi)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});
