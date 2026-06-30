import { describe, expect, it } from 'vitest';
import { esitiPrelievoAcciaio, esitoPiega, raggruppaAcciaio, type EsitoParam } from '../acciaio.ts';
import type { PrelievoAcciaio, Terna } from '../../core/index.ts';

function prelievo(over: Partial<PrelievoAcciaio> = {}): PrelievoAcciaio {
  return {
    id: 'WBS|AC1-1',
    wbs: 'TO59',
    verbale: 'AC1-1',
    data: '05/07/2024',
    produttore: 'FERRIERE NORD',
    diametro: 12,
    fy: [500, 510, 520] as Terna,
    agt: [8, 9, 10] as Terna,
    ftfy: [1.2, 1.25, 1.3] as Terna,
    piega: 'Positivo',
    ...over,
  };
}

describe('domain/acciaio — esiti soglia B450C (complete)', () => {
  it('tutto in range → tutti Positivi e controllo Positivo', () => {
    const e = esitiPrelievoAcciaio(prelievo());
    expect(e).toMatchObject({
      fy: 'Positivo',
      agt: 'Positivo',
      ftfy: 'Positivo',
      piega: 'Positivo',
    });
    expect(e.controllo).toBe('Positivo');
  });

  it('fy oltre il limite superiore (572) → fy Negativo, controllo Negativo', () => {
    const e = esitiPrelievoAcciaio(prelievo({ fy: [500, 600, 520] }));
    expect(e.fy).toBe('Negativo');
    expect(e.controllo).toBe('Negativo');
  });

  it('fy sotto il limite inferiore (425) → Negativo (soglia COMPLETA, non solo sup.)', () => {
    expect(esitiPrelievoAcciaio(prelievo({ fy: [400, 500, 510] })).fy).toBe('Negativo');
  });

  it('Agt sotto 6% → Negativo', () => {
    expect(esitiPrelievoAcciaio(prelievo({ agt: [5.5, 8, 9] })).agt).toBe('Negativo');
  });

  it('ft/fy fuori da 1,13–1,37 → Negativo (vincolante)', () => {
    expect(esitiPrelievoAcciaio(prelievo({ ftfy: [1.1, 1.2, 1.3] })).ftfy).toBe('Negativo');
    expect(esitiPrelievoAcciaio(prelievo({ ftfy: [1.2, 1.4, 1.3] })).ftfy).toBe('Negativo');
  });

  it('valori mancanti (NaN) → incompleto (neutro, non bocciato)', () => {
    const e = esitiPrelievoAcciaio(prelievo({ fy: [Number.NaN, Number.NaN, Number.NaN] }));
    expect(e.fy).toBe('incompleto');
    expect(e.controllo).toBe('incompleto');
  });
});

describe('domain/acciaio — esitoPiega', () => {
  const casi: [string, EsitoParam][] = [
    ['Positivo', 'Positivo'],
    ['F', 'Positivo'],
    ['negativo', 'Negativo'],
    ['', 'incompleto'],
  ];
  it.each(casi)('piega «%s» → %s', (val, atteso) => {
    expect(esitoPiega(val)).toBe(atteso);
  });
});

describe('domain/acciaio — raggruppaAcciaio (WBS, Ø, produttore)', () => {
  it('stesso Ø+produttore+WBS coesi; produttore diverso → gruppo separato', () => {
    const a = prelievo({ id: 'a', verbale: 'AC1-1' });
    const b = prelievo({ id: 'b', verbale: 'AC1-2' });
    const c = prelievo({ id: 'c', verbale: 'AC1-3', produttore: 'STEFANA' });
    const gruppi = raggruppaAcciaio([a, b, c]);
    expect(gruppi).toHaveLength(2);
    expect(gruppi.find((g) => g.produttore === 'FERRIERE NORD')?.prelievi).toHaveLength(2);
  });

  it('Ø diverso → gruppo separato', () => {
    const gruppi = raggruppaAcciaio([prelievo({ id: 'a' }), prelievo({ id: 'b', diametro: 16 })]);
    expect(gruppi).toHaveLength(2);
  });
});
