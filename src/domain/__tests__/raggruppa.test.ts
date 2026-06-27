import { describe, it, expect } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import { raggruppa, avvisiGruppo, calcolaControllo } from '../index.ts';

let seq = 0;
function pref(over: Partial<Prelievo> = {}): Prelievo {
  seq += 1;
  return {
    id: `t${seq}`,
    verbale: `CLS/${seq}`,
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'Fondazione',
    rck: 30,
    mix: 'MIX-1',
    certificato: 'C',
    r1: 40,
    r2: 40,
    ...over,
  };
}
/** prelievo NON refertato: solo campi di Fase 1 (niente R/cert). */
function pnon(over: Partial<Prelievo> = {}): Prelievo {
  seq += 1;
  return {
    id: `n${seq}`,
    verbale: `CLS/${seq}`,
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'Fondazione',
    rck: 30,
    mix: 'MIX-1',
    ...over,
  };
}

describe('raggruppa — strategia AUTO (terzine consecutive)', () => {
  it('6 refertati → 2 terzine', () => {
    const g = raggruppa([pref(), pref(), pref(), pref(), pref(), pref()], 'auto');
    expect(g.map((x) => x.prelieviIds.length)).toEqual([3, 3]);
  });
  it('7 refertati → 3 gruppi (ultimo parziale di 1)', () => {
    const g = raggruppa(
      Array.from({ length: 7 }, () => pref()),
      'auto',
    );
    expect(g.map((x) => x.prelieviIds.length)).toEqual([3, 3, 1]);
  });
  it('esclude i NON refertati', () => {
    const g = raggruppa([pref(), pnon(), pref(), pref()], 'auto');
    expect(g.flatMap((x) => x.prelieviIds)).toHaveLength(3);
  });
  it('mantiene l’ordine dato (metodo Excel)', () => {
    const a = pref({ verbale: 'CLS/100' });
    const b = pref({ verbale: 'CLS/200' });
    const c = pref({ verbale: 'CLS/300' });
    const g = raggruppa([a, b, c], 'auto');
    expect(g[0].prelieviIds).toEqual([a.id, b.id, c.id]);
  });
});

describe('raggruppa — strategia ASSISTITO (mix + parte + tempo)', () => {
  it('separa per mix/parte e ordina per data', () => {
    const a = pref({ mix: 'MIX-A', parte: 'P1', data: '10/03/2024' });
    const b = pref({ mix: 'MIX-A', parte: 'P1', data: '01/03/2024' });
    const c = pref({ mix: 'MIX-B', parte: 'P1', data: '05/03/2024' });
    const g = raggruppa([a, b, c], 'assistito');
    // due bucket: {MIX-A/P1} con b prima di a (data), {MIX-B/P1} con c
    expect(g).toHaveLength(2);
    const bucketA = g.find((x) => x.prelieviIds.includes(a.id))!;
    expect(bucketA.prelieviIds).toEqual([b.id, a.id]); // ordinati per data
    expect(bucketA.avvisi).toEqual([]); // omogeneo → nessun avviso
  });
});

describe('raggruppa — strategia MANUALE', () => {
  it('non propone nulla (l’utente compone)', () => {
    expect(raggruppa([pref(), pref()], 'manuale')).toEqual([]);
  });
});

describe('avvisiGruppo (composizione, non bloccante)', () => {
  it('mix diversi → avviso', () => {
    const a = avvisiGruppo([pref({ mix: 'X' }), pref({ mix: 'Y' })]);
    expect(a.some((s) => s.toLowerCase().includes('omogeneo'))).toBe(true);
  });
  it('parti d’opera diverse → avviso', () => {
    const a = avvisiGruppo([pref({ parte: 'P1' }), pref({ parte: 'P2' })]);
    expect(a.some((s) => s.toLowerCase().includes("parti d'opera"))).toBe(true);
  });
  it('gruppo omogeneo → nessun avviso', () => {
    expect(avvisiGruppo([pref(), pref(), pref()])).toEqual([]);
  });
});

describe('calcolaControllo — selezione A/B (§1.5) e forzatura', () => {
  it('n < 15 e volume piccolo → Tipo A', () => {
    const e = calcolaControllo([pref(), pref(), pref()], { volumeMc: 200 });
    expect(e.suggerimento.tipo).toBe('A');
    expect(e.tipoApplicato).toBe('A');
  });
  it('volume > 1500 m³ → Tipo B', () => {
    const e = calcolaControllo([pref(), pref(), pref()], { volumeMc: 1600 });
    expect(e.suggerimento.tipo).toBe('B');
    expect(e.suggerimento.motivo).toContain('1500');
  });
  it('n ≥ 15 → Tipo B', () => {
    const e = calcolaControllo(Array.from({ length: 15 }, () => pref()));
    expect(e.suggerimento.tipo).toBe('B');
  });
  it('forzatura del tipo: applico B anche se suggerito A', () => {
    const e = calcolaControllo([pref(), pref(), pref()], { tipo: 'B' });
    expect(e.suggerimento.tipo).toBe('A');
    expect(e.tipoApplicato).toBe('B');
    expect(e.risultato.tipo).toBe('B');
  });
  it('flag forzato propagato sul risultato', () => {
    const e = calcolaControllo([pref(), pref(), pref()], { forzato: true });
    expect(e.risultato.forzato).toBe(true);
  });
});
