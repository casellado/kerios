import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRegistroClsCsv } from '../csv.ts';
import { raggruppa } from '../../domain/index.ts';

/**
 * FIX M3 sul registro REALE ST11: la strategia AUTO deve raggruppare SOLO entro
 * la stessa MISCELA OMOGENEA (stesso mix design). Caso emerso al collaudo: CLS
 * 5607 (mix PP01R15, Rck 15) NON deve finire con CLS 5683/5684 (mix PP01R40,
 * Rck 40); e i due mix Rck 40 (PP01R40XC2S4IF vs C40S4D25XA2) restano separati.
 */
const CSV = fileURLToPath(
  new URL('../../../reference/dati-reali/Registro_CLS_ST11.csv', import.meta.url),
);
const prelievi = parseRegistroClsCsv(new Uint8Array(readFileSync(CSV))).prelievi;
const mixOf = new Map(prelievi.map((p) => [p.id, p.mix]));
const idDi = (verbale: string) => prelievi.find((p) => p.verbale === verbale)!.id;
const gruppi = raggruppa(prelievi, 'auto');

describe('FIX M3 — AUTO su registro ST11: raggruppa per miscela omogenea', () => {
  it('ogni gruppo contiene UN SOLO mix', () => {
    for (const g of gruppi) {
      expect(new Set(g.prelieviIds.map((id) => mixOf.get(id))).size).toBeLessThanOrEqual(1);
    }
  });

  it('CLS 5607 (PP01R15) è in un gruppo SEPARATO da CLS 5683/5684 (PP01R40)', () => {
    const g5607 = gruppi.find((g) => g.prelieviIds.includes(idDi('CLS 5607')))!;
    expect(g5607.prelieviIds).not.toContain(idDi('CLS 5683'));
    expect(g5607.prelieviIds).not.toContain(idDi('CLS 5684'));
    // unico prelievo con mix PP01R15 → gruppo di 1
    expect(g5607.prelieviIds).toEqual([idDi('CLS 5607')]);
  });

  it('i due mix Rck 40 (PP01R40 vs C40) non finiscono mai nello stesso gruppo', () => {
    const isPP = (id: string) => mixOf.get(id)?.startsWith('PP01R40');
    const isC40 = (id: string) => mixOf.get(id)?.startsWith('C40');
    for (const g of gruppi) {
      const hasPP = g.prelieviIds.some(isPP);
      const hasC40 = g.prelieviIds.some(isC40);
      expect(hasPP && hasC40).toBe(false);
    }
  });

  it('i 3 mix del registro generano gruppi distinti (nessuna contaminazione)', () => {
    const mixDeiGruppi = gruppi.map((g) => mixOf.get(g.prelieviIds[0]));
    expect(new Set(mixDeiGruppi).size).toBe(3);
  });
});
