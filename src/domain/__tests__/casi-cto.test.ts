import { describe, it, expect } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import {
  validitaPrelievo,
  controlloTipoA,
  controlloTipoB,
  suggerisciTipoControllo,
  scartoQuadraticoMedio,
} from '../index.ts';

/**
 * CASI TEST DEL CTO — "tabella delle risposte giuste" calcolata A MANO in modo
 * INDIPENDENTE dal codice (matematica NTC pura). Sono la verità di riferimento:
 * se uno fallisce, il codice diverge dalla norma (da segnalare, non aggirare).
 * Arrotondamenti: scarto% a 2 prima del confronto; Rm/Rck_eff a 2 in output;
 * confronti di soglia a precisione piena; s campionario (n−1).
 */

let n = 0;
function pr(rc: number, rck = 40): Prelievo {
  n += 1;
  return {
    id: `cto${n}`,
    verbale: `CLS/${n}`,
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'P',
    rck,
    mix: 'M',
    certificato: 'C',
    r1: rc,
    r2: rc,
  };
}
const terzina = (a: number, b: number, c: number, rck = 40) => [pr(a, rck), pr(b, rck), pr(c, rck)];

// ─────────────── Caso 1 — Prelievo NULLO (scarto > 20%) ───────────────
describe('Caso 1 — prelievo NULLO (scarto > 20%)', () => {
  it.each([
    [50, 40, 25.0],
    [60, 49, 22.45],
    [45, 37, 21.62],
  ])('%d / %d → scarto %f%% → NULLO', (r1, r2, scarto) => {
    const e = validitaPrelievo(r1, r2);
    expect(e.scartoPct).toBe(scarto);
    expect(e.valido).toBe(false);
  });
});

// ─────────────── Caso 2 — confine ESATTO 20% → VALIDO ───────────────
describe('Caso 2 — confine validità 20,00% esatto → VALIDO (trap floating-point)', () => {
  it.each([
    [48, 40],
    [60, 50],
    [36, 30],
  ])('%d / %d → 20,00%% → VALIDO', (r1, r2) => {
    const e = validitaPrelievo(r1, r2);
    expect(e.scartoPct).toBe(20);
    expect(e.valido).toBe(true);
  });
});

// ─────────────── Caso 3 — TIPO A NON CONFORME (media sotto soglia) ───────────────
describe('Caso 3 — Tipo A NON CONFORME: media sotto Rck+3,5 (Rck 40)', () => {
  it('42,41,43 → Rm 42,00 · Rck_eff 38,50 · d1 NO → NON CONFORME', () => {
    const r = controlloTipoA(terzina(42, 41, 43));
    expect(r.rcm28).toBe(42);
    expect(r.rcmin).toBe(41);
    expect(r.disug1.ok).toBe(false);
    expect(r.disug2.ok).toBe(true);
    expect(r.rckEffettiva).toBe(38.5);
    expect(r.conforme).toBe(false);
  });
  it('44,40,41 → Rm 41,67 · Rck_eff 38,17 · d1 NO → NON CONFORME', () => {
    const r = controlloTipoA(terzina(44, 40, 41));
    expect(r.rcm28).toBe(41.67);
    expect(r.rcmin).toBe(40);
    expect(r.disug1.ok).toBe(false);
    expect(r.rckEffettiva).toBe(38.17);
    expect(r.conforme).toBe(false);
  });
});

// ─────────────── Caso 4 — TIPO A NON CONFORME (minimo sotto soglia) ───────────────
describe('Caso 4 — Tipo A NON CONFORME: un valore basso → Rcmin sotto Rck−3,5 (Rck 40)', () => {
  it('55,54,35 → Rm 48 · Rmin 35 · d1 sì, d2 NO · Rck_eff 38,50 → NON CONFORME', () => {
    const r = controlloTipoA(terzina(55, 54, 35));
    expect(r.rcm28).toBe(48);
    expect(r.rcmin).toBe(35);
    expect(r.disug1.ok).toBe(true);
    expect(r.disug2.ok).toBe(false);
    expect(r.rckEffettiva).toBe(38.5);
    expect(r.conforme).toBe(false);
  });
  it('50,48,34 → Rm 44 · Rmin 34 · d2 NO · Rck_eff 37,50 → NON CONFORME', () => {
    const r = controlloTipoA(terzina(50, 48, 34));
    expect(r.rcm28).toBe(44);
    expect(r.rcmin).toBe(34);
    expect(r.disug1.ok).toBe(true);
    expect(r.disug2.ok).toBe(false);
    expect(r.rckEffettiva).toBe(37.5);
    expect(r.conforme).toBe(false);
  });
});

// ─────────────── Caso 5 — TIPO A CONFORME al limite ───────────────
describe('Caso 5 — Tipo A CONFORME al limite (Rck 40)', () => {
  it('43,5 · 44 · 45 → Rm 44,17 · Rck_eff 40,67 → CONFORME', () => {
    const r = controlloTipoA(terzina(43.5, 44, 45));
    expect(r.rcm28).toBe(44.17);
    expect(r.rcmin).toBe(43.5);
    expect(r.disug1.ok).toBe(true);
    expect(r.disug2.ok).toBe(true);
    expect(r.rckEffettiva).toBe(40.67);
    expect(r.conforme).toBe(true);
  });
  it('44 · 43,5 · 43,6 → Rm 43,70 · Rck_eff 40,20 → CONFORME', () => {
    const r = controlloTipoA(terzina(44, 43.5, 43.6));
    expect(r.rcm28).toBe(43.7);
    expect(r.rcmin).toBe(43.5);
    expect(r.rckEffettiva).toBe(40.2);
    expect(r.conforme).toBe(true);
  });
});

// ─────────────── Caso 6 — TIPO B dispersione alta (avviso CV, no rifiuto) ───────────────
describe('Caso 6 — Tipo B NON CONFORME per d1, CV alto (avviso, non rifiuto), Rck 40', () => {
  const valori = [60, 30, 55, 35, 58, 32, 50, 40, 62, 28, 45, 38, 52, 33, 48];
  const r = controlloTipoB(valori.map((v) => pr(v, 40)));
  it('Rm 44,40 · soglia 57,07 · d1 NO', () => {
    expect(r.rcm28).toBe(44.4);
    expect(r.disug1.richiesto).toBe(57.07);
    expect(r.disug1.ok).toBe(false);
  });
  it('s campionario ≈ 11,531 (n−1) · CV ≈ 0,260', () => {
    expect(scartoQuadraticoMedio(valori)).toBeCloseTo(11.531, 3);
    expect(r.cv).toBeCloseTo(0.26, 3);
  });
  it('CV>0,15 avviso ma NON rifiuto → NON CONFORME (non rifiutato automaticamente)', () => {
    expect(r.avvisi.some((a) => a.includes('controlli più accurati'))).toBe(true);
    expect(r.avvisi.some((a) => a.includes('NON accettabile'))).toBe(false);
    expect(r.conforme).toBe(false);
  });
});

// ─────────────── Caso 7 — TIPO B CONFORME (poco disperso) ───────────────
describe('Caso 7 — Tipo B CONFORME (15 valori buoni), Rck 40', () => {
  const valori = [52, 53, 51, 54, 52, 53, 51, 52, 54, 53, 52, 51, 53, 52, 54];
  const r = controlloTipoB(valori.map((v) => pr(v, 40)));
  it('Rm 52,47 · Rmin 51 · s ≈ 1,06 · soglia 41,57 → CONFORME', () => {
    expect(r.rcm28).toBe(52.47);
    expect(r.rcmin).toBe(51);
    expect(scartoQuadraticoMedio(valori)).toBeCloseTo(1.06, 2);
    expect(r.disug1.richiesto).toBe(41.57);
    expect(r.disug1.ok).toBe(true);
    expect(r.disug2.ok).toBe(true);
    expect(r.conforme).toBe(true);
  });
});

// ─────────────── Caso 8 — selezione automatica A/B ───────────────
describe('Caso 8 — selezione automatica Tipo A / Tipo B', () => {
  const gruppo = (n: number) => Array.from({ length: n }, () => pr(40));
  it.each([
    ['piccolo', 3, 200, 'A'],
    ['medio', 14, 800, 'A'],
    ['molti prelievi', 15, 900, 'B'],
    ['volume grande', 8, 1600, 'B'],
    ['entrambi', 20, 2000, 'B'],
  ])('%s: n=%d vol=%d → Tipo %s', (_scenario, nn, vol, atteso) => {
    expect(suggerisciTipoControllo(gruppo(nn as number), vol as number).tipo).toBe(atteso);
  });
});
