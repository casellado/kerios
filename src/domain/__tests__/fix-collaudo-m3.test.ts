import { describe, it, expect } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import {
  calcolaControllo,
  controlloCompleto,
  prelieviCompatibili,
  guardrailPerMix,
  parseDataIt,
} from '../index.ts';

let seq = 0;
function pr(over: Partial<Prelievo> = {}): Prelievo {
  seq += 1;
  return {
    id: `f${seq}`,
    verbale: `CLS/${seq}`,
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'P',
    rck: 40,
    mix: 'MIX-A',
    certificato: 'C',
    r1: 45,
    r2: 45,
    ...over,
  };
}

// ─────────────── P2/P3 — controllo completo vs aperto ───────────────
describe('controlloCompleto — soglia minima per tipo', () => {
  it('Tipo A: n≥3 completo, n<3 aperto', () => {
    expect(controlloCompleto(calcolaControllo([pr(), pr(), pr()]).risultato)).toBe(true);
    expect(controlloCompleto(calcolaControllo([pr(), pr()]).risultato)).toBe(false);
    expect(controlloCompleto(calcolaControllo([pr()]).risultato)).toBe(false);
  });
  it('Tipo B: completo solo con n≥15', () => {
    const dieci = Array.from({ length: 10 }, () => pr());
    expect(controlloCompleto(calcolaControllo(dieci, { tipo: 'B' }).risultato)).toBe(false);
  });
});

// ─────────────── P4 — prelievi compatibili (menu "aggiungi") ───────────────
describe('prelieviCompatibili — stesso mix, non assegnati, ordine temporale', () => {
  const a1 = pr({ mix: 'MIX-A', data: '01/03/2024' });
  const a2 = pr({ mix: 'MIX-A', data: '20/03/2024' });
  const b1 = pr({ mix: 'MIX-B', data: '02/03/2024' });
  const refert = [a1, a2, b1];

  it('propone SOLO lo stesso mix del controllo', () => {
    const r = prelieviCompatibili(refert, {
      mix: 'MIX-A',
      esclusi: new Set(),
      dateRiferimento: [],
    });
    expect(r.map((p) => p.id).sort()).toEqual([a1.id, a2.id].sort());
    expect(r.some((p) => p.id === b1.id)).toBe(false);
  });
  it('esclude i prelievi già assegnati (no media mobile)', () => {
    const r = prelieviCompatibili(refert, {
      mix: 'MIX-A',
      esclusi: new Set([a1.id]),
      dateRiferimento: [],
    });
    expect(r.map((p) => p.id)).toEqual([a2.id]);
  });
  it('ordina per vicinanza temporale ai prelievi del gruppo', () => {
    // riferimento vicino al 19/03 → a2 (20/03) prima di a1 (01/03)
    const rif = parseDataIt('19/03/2024')!;
    const r = prelieviCompatibili(refert, {
      mix: 'MIX-A',
      esclusi: new Set(),
      dateRiferimento: [rif],
    });
    expect(r.map((p) => p.id)).toEqual([a2.id, a1.id]);
  });
  it('mix undefined (gruppo vuoto) → nessun vincolo di mix, ordine cronologico', () => {
    const r = prelieviCompatibili(refert, {
      mix: undefined,
      esclusi: new Set(),
      dateRiferimento: [],
    });
    expect(r.map((p) => p.id)).toEqual([a1.id, b1.id, a2.id]); // 01/03, 02/03, 20/03
  });
});

// ─────────────── PASSO 1 — guardrail per mix ───────────────
describe('guardrailPerMix — controlli completi e cosa manca per il mix', () => {
  it('10 refertati stesso mix → 3 completi, 1 aperto, mancano 2 prelievi (4 cubetti)', () => {
    const g = guardrailPerMix(Array.from({ length: 10 }, () => pr({ mix: 'X' })));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      mix: 'X',
      nRefertati: 10,
      terzineComplete: 3,
      restoAperto: 1,
      prelieviMancanti: 2,
      cubettiMancanti: 4,
    });
  });
  it('6 refertati → 2 completi, nessun aperto', () => {
    const g = guardrailPerMix(Array.from({ length: 6 }, () => pr({ mix: 'Y' })));
    expect(g[0]).toMatchObject({ terzineComplete: 2, restoAperto: 0, prelieviMancanti: 0 });
  });
  it('conta solo i refertati; separa per mix', () => {
    const nonRef: Prelievo = {
      id: 'nr',
      verbale: 'v',
      data: 'd',
      wbs: 'w',
      parte: 'p',
      rck: 40,
      mix: 'X',
    };
    const g = guardrailPerMix([pr({ mix: 'X' }), pr({ mix: 'Z' }), nonRef]);
    expect(g.map((x) => x.mix).sort()).toEqual(['X', 'Z']);
    expect(g.find((x) => x.mix === 'X')!.nRefertati).toBe(1);
  });
});
