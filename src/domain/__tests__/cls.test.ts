import { describe, it, expect } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import {
  statoPrelievo,
  resistenzaPrelievo,
  validitaPrelievo,
  controlloTipoA,
  controlloTipoB,
  valutaTipoB,
  suggerisciTipoControllo,
} from '../cls.ts';

// ── builder di test ──────────────────────────────────────────────────────────
let seq = 0;
/** Prelievo REFERTATO con Rc = rc (r1=r2=rc). rck e mix configurabili. */
function pref(rc: number, rck = 30, mix = 'MIX-1'): Prelievo {
  seq += 1;
  return {
    id: `t${seq}`,
    verbale: `CLS/${seq}`,
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'Fondazione',
    rck,
    mix,
    certificato: `CERT-${seq}`,
    dataProva: '29/01/2024',
    r1: rc,
    r2: rc,
  };
}
/** Prelievo con R1/R2 distinti (per Rc = media). */
function prefR(r1: number, r2: number, rck = 30, mix = 'MIX-1'): Prelievo {
  const p = pref((r1 + r2) / 2, rck, mix);
  return { ...p, r1, r2 };
}

// ── Ciclo di vita / stato derivato ──────────────────────────────────────────
describe('statoPrelievo (stato derivato, §1.0)', () => {
  const base: Prelievo = {
    id: 'x',
    verbale: 'CLS/1',
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'P',
    rck: 30,
    mix: 'M',
  };
  it('Fase 1 = verbale', () => {
    expect(statoPrelievo(base)).toBe('verbale');
  });
  it('Fase 2 = trasmesso (protocollo richiesta)', () => {
    expect(statoPrelievo({ ...base, protRichiesta: 'CDG-1' })).toBe('trasmesso');
  });
  it('Fase 3 = refertato (r1,r2,certificato)', () => {
    expect(statoPrelievo({ ...base, r1: 40, r2: 41, certificato: 'C1' })).toBe('refertato');
  });
  it('r1,r2 senza certificato → NON ancora refertato', () => {
    expect(statoPrelievo({ ...base, r1: 40, r2: 41 })).toBe('verbale');
  });
});

// ── Resistenza di prelievo ──────────────────────────────────────────────────
describe('resistenzaPrelievo (media R1,R2)', () => {
  it('overload (r1,r2)', () => {
    expect(resistenzaPrelievo(56.5, 49)).toBeCloseTo(52.75, 10);
  });
  it('overload (prelievo refertato)', () => {
    expect(resistenzaPrelievo(prefR(56.5, 49))).toBeCloseTo(52.75, 10);
  });
  it('prelievo non refertato → undefined', () => {
    const p: Prelievo = {
      id: 'x',
      verbale: 'v',
      data: 'd',
      wbs: 'w',
      parte: 'p',
      rck: 30,
      mix: 'm',
    };
    expect(resistenzaPrelievo(p)).toBeUndefined();
  });
});

// ── Validità del prelievo (§1.2) — casi del documento ───────────────────────
describe('validitaPrelievo (scarto ≤ 20%)', () => {
  it('24 / 23,3 → 3,00% valido', () => {
    const e = validitaPrelievo(24, 23.3);
    expect(e.scartoPct).toBe(3);
    expect(e.valido).toBe(true);
  });
  it('56,5 / 49 → 15,31% valido', () => {
    const e = validitaPrelievo(56.5, 49);
    expect(e.scartoPct).toBe(15.31);
    expect(e.valido).toBe(true);
  });
  it('50 / 40 → 25,00% NULLO', () => {
    const e = validitaPrelievo(50, 40);
    expect(e.scartoPct).toBe(25);
    expect(e.valido).toBe(false);
  });
  it('confine esatto 20% → valido (48/40)', () => {
    const e = validitaPrelievo(48, 40);
    expect(e.scartoPct).toBe(20);
    expect(e.valido).toBe(true);
  });
  it('appena sopra 20% → nullo (48,2/40 = 20,5%)', () => {
    const e = validitaPrelievo(48.2, 40);
    expect(e.scartoPct).toBe(20.5);
    expect(e.valido).toBe(false);
  });
  it('ordine R1/R2 indifferente', () => {
    expect(validitaPrelievo(23.3, 24)).toEqual(validitaPrelievo(24, 23.3));
  });
});

// ── Tipo A (§1.3) + Rck effettiva (§1.4-bis) ────────────────────────────────
describe('controlloTipoA', () => {
  it('caso documento: Rck=30, Rc={37,35,36} → CONFORME', () => {
    const r = controlloTipoA([pref(37), pref(35), pref(36)]);
    expect(r.tipo).toBe('A');
    expect(r.n).toBe(3);
    expect(r.rcm28).toBe(36);
    expect(r.rcmin).toBe(35);
    expect(r.disug1).toMatchObject({ richiesto: 33.5, valore: 36, ok: true });
    expect(r.disug2).toMatchObject({ richiesto: 26.5, valore: 35, ok: true });
    expect(r.rckEffettiva).toBe(32.5); // MIN(35+3,5 ; 36−3,5) = MIN(38,5 ; 32,5)
    expect(r.rckEffettiva! >= r.rck).toBe(true); // conforme ⟺ Rck_eff ≥ Rck
    expect(r.conforme).toBe(true);
  });

  it('NON conforme se Rcmin sotto Rck−3,5', () => {
    // Rck=40; Rc={45,44,26} → Rcmin 26 < 36,5 → disug2 fallisce
    const r = controlloTipoA([pref(45, 40), pref(44, 40), pref(26, 40)]);
    expect(r.disug2.ok).toBe(false);
    expect(r.conforme).toBe(false);
  });

  it('avviso se meno di 3 prelievi e non conforme', () => {
    const r = controlloTipoA([pref(40), pref(41)]);
    expect(r.n).toBe(2);
    expect(r.conforme).toBe(false);
    expect(r.avvisi.some((a) => a.includes('almeno 3'))).toBe(true);
  });

  it('mix diversi → miscela non omogenea + avviso (non blocca il calcolo)', () => {
    const r = controlloTipoA([pref(40, 30, 'MIX-1'), pref(41, 30, 'MIX-2'), pref(42, 30, 'MIX-1')]);
    expect(r.miscelaOmogenea).toBe(false);
    expect(r.avvisi.some((a) => a.toLowerCase().includes('omogeneo'))).toBe(true);
  });
});

// ── Tipo B (§1.4) — caso CORRETTO sugli aggregati documentati ───────────────
describe('valutaTipoB (caso documento: media 53,1 ; min 50,4 ; s 9 ; Rck 40)', () => {
  const e = valutaTipoB(53.1, 50.4, 9, 40);
  it('Disug.1: soglia 53,32 e valore 53,1 → NO (manca per un soffio)', () => {
    expect(e.disug1.richiesto).toBe(53.32); // 40 + 1,48·9
    expect(e.disug1.valore).toBe(53.1);
    expect(e.disug1.ok).toBe(false);
  });
  it('Disug.2: 50,4 ≥ 36,5 → OK', () => {
    expect(e.disug2).toMatchObject({ richiesto: 36.5, valore: 50.4, ok: true });
  });
  it('una disuguaglianza non verificata → NON CONFORME', () => {
    expect(e.conforme).toBe(false);
  });
  it('CV 0,169 → avviso (>0,15) ma non rifiuto', () => {
    expect(e.cv).toBeCloseTo(0.169, 3);
    expect(e.avvisi.some((a) => a.includes('controlli più accurati'))).toBe(true);
  });
});

describe('valutaTipoB — vincoli sul CV (§1.4)', () => {
  it('CV > 0,30 → NON accettabile anche se le disuguaglianze passano', () => {
    // Rck=10, media 60, min 30, s 20 → cv 0,333 ; disug pass ma rifiuto vince
    const e = valutaTipoB(60, 30, 20, 10);
    expect(e.disug1.ok).toBe(true);
    expect(e.disug2.ok).toBe(true);
    expect(e.cv).toBeGreaterThan(0.3);
    expect(e.conforme).toBe(false);
    expect(e.avvisi.some((a) => a.includes('NON accettabile'))).toBe(true);
  });
});

describe('controlloTipoB (end-to-end su 15 prelievi)', () => {
  it('bassa dispersione → CONFORME, e s coincide con n−1', () => {
    const valori = [38, 39, 40, 38, 39, 40, 38, 39, 40, 38, 39, 40, 38, 39, 40];
    const r = controlloTipoB(valori.map((v) => pref(v, 30)));
    expect(r.tipo).toBe('B');
    expect(r.n).toBe(15);
    expect(r.rckEffettiva).toBeUndefined(); // decisione CTO
    // verifica incrociata della media e dello scarto (n−1) calcolati indipendentemente
    const m = valori.reduce((a, b) => a + b, 0) / valori.length;
    const sRef = Math.sqrt(valori.reduce((a, v) => a + (v - m) ** 2, 0) / (valori.length - 1));
    expect(r.rcm28).toBeCloseTo(m, 2);
    expect(r.s).toBeCloseTo(sRef, 2);
    expect(r.conforme).toBe(true);
  });
});

// ── Selezione del tipo (§1.5) ───────────────────────────────────────────────
describe('suggerisciTipoControllo', () => {
  it('> 1500 m³ → Tipo B (obbligatorio)', () => {
    const s = suggerisciTipoControllo([pref(40), pref(41), pref(42)], 1600);
    expect(s.tipo).toBe('B');
    expect(s.motivo).toContain('1500');
  });
  it('n ≥ 15 → Tipo B (applicabile)', () => {
    const prelievi = Array.from({ length: 15 }, () => pref(40));
    expect(suggerisciTipoControllo(prelievi).tipo).toBe('B');
  });
  it('3 ≤ n < 15 e ≤ 1500 m³ → Tipo A', () => {
    const s = suggerisciTipoControllo([pref(40), pref(41), pref(42)], 500);
    expect(s.tipo).toBe('A');
  });
  it('volume esattamente 1500 (non >1500) e n<15 → Tipo A', () => {
    expect(suggerisciTipoControllo([pref(40), pref(41), pref(42)], 1500).tipo).toBe('A');
  });
});
