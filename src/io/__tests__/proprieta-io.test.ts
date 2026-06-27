import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseNumeroIt, formattaNumeroIt } from '../formato.ts';
import { parseSiglaImport } from '../../core/index.ts';
import { parseRegistroClsCsv } from '../csv.ts';

const RUNS = { numRuns: 1000 };

describe('Proprietà — Import: numeri italiani (round-trip)', () => {
  it('I1 — x (1 dec) → "x,xx" (virgola, 2 dec) → x', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 900 }).map((n) => n / 10),
        (x) => {
          const s = formattaNumeroIt(x, 2);
          expect(s).toMatch(/^\d+,\d{2}$/); // virgola, esattamente 2 decimali
          expect(parseNumeroIt(s)).toBeCloseTo(x, 2);
        },
      ),
      RUNS,
    );
  });

  it('I1-bis — parseNumeroIt accetta virgola e punto, scarta il vuoto', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9000 }).map((n) => n / 10),
        (x) => {
          expect(parseNumeroIt(x.toString().replace('.', ','))).toBeCloseTo(x, 9);
        },
      ),
      RUNS,
    );
    expect(parseNumeroIt('')).toBeUndefined();
    expect(parseNumeroIt('   ')).toBeUndefined();
  });
});

describe('Proprietà — Import: sigle (storico + nuovo)', () => {
  it('I3 — parseSiglaImport riconosce prefisso+separatore+numero (con/ senza zeri)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CLS', 'AC1'),
        fc.constantFrom('/', ' ', '-'),
        fc.integer({ min: 1, max: 99999 }),
        fc.boolean(),
        (pre, sep, num, pad) => {
          const numStr = pad ? String(num).padStart(6, '0') : String(num);
          const r = parseSiglaImport(`${pre}${sep}${numStr}`);
          expect(r).not.toBeNull();
          expect(r?.numero).toBe(num);
          expect(r?.prefisso).toBe(pre);
        },
      ),
      RUNS,
    );
  });
});

describe('Proprietà — Import: idempotenza (chiave = id)', () => {
  const CSV = fileURLToPath(
    new URL('../../../reference/dati-reali/Registro_CLS_ST11.csv', import.meta.url),
  );
  const bytes = new Uint8Array(readFileSync(CSV));

  it('I2 — re-import dello stesso file non duplica (id stabili, dedup → 22)', () => {
    const e1 = parseRegistroClsCsv(bytes);
    const e2 = parseRegistroClsCsv(bytes);
    expect(e1.prelievi.map((p) => p.id)).toEqual(e2.prelievi.map((p) => p.id));
    // bulkPut usa la chiave id → un Map per id collassa i doppioni
    const m = new Map<string, unknown>();
    for (const p of [...e1.prelievi, ...e2.prelievi]) m.set(p.id, p);
    expect(m.size).toBe(22);
    // gli id sono univoci già nel singolo import
    expect(new Set(e1.prelievi.map((p) => p.id)).size).toBe(22);
  });
});
