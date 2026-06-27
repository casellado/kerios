import { describe, it, expect } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import { validitaPrelievo, controlloTipoA } from '../cls.ts';

/**
 * PUNTI FISSI — ancore verificate A MANO (non generate). Affiancano le proprietà
 * (proprieta.test.ts) e i casi reali ST36 (io/__tests__/st36.test.ts).
 * Gli "8 casi del CTO" (docs/casi-test-cto.md) sono encodati in casi-cto.test.ts.
 */

let n = 0;
function pr(rc: number, rck: number): Prelievo {
  n += 1;
  return {
    id: `f${n}`,
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

describe('C2 — confine validità esatto 20,00% → VALIDO', () => {
  it.each([
    [48, 40],
    [60, 50],
    [36, 30],
  ])('%d / %d → scarto 20,00%% → valido', (a, b) => {
    const e = validitaPrelievo(a, b);
    expect(e.scartoPct).toBe(20);
    expect(e.valido).toBe(true);
  });
});

describe('Caso4 — Tipo A: minimo sotto soglia benché media alta → NON CONFORME', () => {
  it('[55, 54, 35] Rck 40 → non conforme (Rcmin 35 < 36,5)', () => {
    const r = controlloTipoA([pr(55, 40), pr(54, 40), pr(35, 40)]);
    expect(r.rcm28).toBe(48); // media alta
    expect(r.rcmin).toBe(35);
    expect(r.disug1.ok).toBe(true); // 48 ≥ 43,5
    expect(r.disug2.ok).toBe(false); // 35 ≥ 36,5 → NO
    expect(r.conforme).toBe(false);
  });
});
