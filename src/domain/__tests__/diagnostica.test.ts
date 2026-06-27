import { describe, it, expect } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import { parseDataIt, giorniTra } from '../date.ts';
import { esitoPreliminare, stagionatura, descriviPrelievo } from '../cls.ts';

function pref(over: Partial<Prelievo>): Prelievo {
  return {
    id: 'x',
    verbale: 'CLS/1',
    data: '13/07/2023',
    wbs: 'ST11',
    parte: 'P',
    rck: 30,
    mix: 'M',
    certificato: 'C',
    r1: 36,
    r2: 36,
    ...over,
  };
}

describe('parseDataIt / giorniTra', () => {
  it('data valida gg/mm/aaaa', () => {
    expect(parseDataIt('13/07/2023')).not.toBeNull();
  });
  it('anno a 2 cifre → 2000+', () => {
    expect(parseDataIt('01/01/23')).toBe(Date.UTC(2023, 0, 1));
  });
  it('data impossibile (31/02) → null; formato ISO → null', () => {
    expect(parseDataIt('31/02/2023')).toBeNull();
    expect(parseDataIt('2023-07-13')).toBeNull();
  });
  it('giorni tra getto e prova (13/07 → 10/08 = 28 gg)', () => {
    expect(giorniTra('13/07/2023', '10/08/2023')).toBe(28);
  });
  it('data mancante → null', () => {
    expect(giorniTra('13/07/2023', undefined)).toBeNull();
  });
});

describe('esitoPreliminare (semaforo §1.4-septies)', () => {
  it('valido e Rc ≥ Rck → conforme', () => {
    expect(esitoPreliminare(pref({ r1: 36, r2: 36, rck: 30 }))?.stato).toBe('conforme');
  });
  it('valido ma Rc sotto Rck entro il margine → da_verificare', () => {
    // Rc 28, Rck 30, margine 3,5 → 28 ≥ 26,5 → giallo
    expect(esitoPreliminare(pref({ r1: 28, r2: 28, rck: 30 }))?.stato).toBe('da_verificare');
  });
  it('Rc nettamente sotto Rck → fuori_soglia', () => {
    expect(esitoPreliminare(pref({ r1: 20, r2: 20, rck: 30 }))?.stato).toBe('fuori_soglia');
  });
  it('prelievo nullo (scarto > 20%) → fuori_soglia', () => {
    expect(esitoPreliminare(pref({ r1: 50, r2: 40, rck: 30 }))?.stato).toBe('fuori_soglia');
  });
  it('non refertato (niente R1/R2) → null', () => {
    const nonRef: Prelievo = {
      id: 'x',
      verbale: 'CLS/1',
      data: '13/07/2023',
      wbs: 'ST11',
      parte: 'P',
      rck: 30,
      mix: 'M',
    };
    expect(esitoPreliminare(nonRef)).toBeNull();
  });
});

describe('stagionatura (§1.4-sexies)', () => {
  it('28 gg canonici → nessun avviso', () => {
    const s = stagionatura(pref({ data: '13/07/2023', dataProva: '10/08/2023' }));
    expect(s.giorni).toBe(28);
    expect(s.avviso).toBeNull();
  });
  it('< 28 gg → avviso prova anticipata', () => {
    const s = stagionatura(pref({ data: '13/07/2023', dataProva: '20/07/2023' }));
    expect(s.giorni).toBe(7);
    expect(s.avviso).toContain('anticipata');
  });
  it('> 45 gg → avviso oltre il limite (carotaggi)', () => {
    const s = stagionatura(pref({ data: '13/07/2023', dataProva: '01/09/2023' }));
    expect(s.giorni! > 45).toBe(true);
    expect(s.avviso).toContain('carotaggi');
  });
});

describe('descriviPrelievo (vista pura per la tabella)', () => {
  it('compone stato, R medio, validità, semaforo, stagionatura', () => {
    const v = descriviPrelievo(pref({ r1: 24, r2: 23.3, rck: 15, dataProva: '10/08/2023' }));
    expect(v.stato).toBe('refertato');
    expect(v.rc).toBeCloseTo(23.65, 10);
    expect(v.validita?.valido).toBe(true);
    expect(v.preliminare?.stato).toBe('conforme'); // 23,65 ≥ 15
    expect(v.stagionaturaGg).toBe(28);
  });
});
