import { describe, expect, it } from 'vitest';
import type { Prelievo } from '../../core/index.ts';
import { SOGLIE_DEFAULT } from '../../core/index.ts';
import { mappaControlloST36, type ControlloPerDoc } from '../st36dati.ts';
import { generaXlsxST36 } from '../xlsxST36.ts';

function p(verbale: string, r1: number, r2: number): Prelievo {
  return {
    id: verbale,
    verbale,
    data: '05/07/2024',
    wbs: 'TO59',
    parte: 'scatolare fondazione',
    rck: 40,
    mix: 'C40',
    laboratorio: 'SIDERCEM S.r.l.',
    certificato: '628268',
    dataProva: '05/08/2024',
    r1,
    r2,
  };
}

describe('st36dati — mappa numerica (valori dall’engine)', () => {
  it('produce numeri (non stringhe) per rck/R1/R2/R + terzina', () => {
    const cd: ControlloPerDoc = {
      ctrl: {
        id: 'k',
        wbs: 'TO59',
        tipo: 'A',
        rck: 40,
        prelieviIds: ['a', 'b', 'c'],
        esito: 'conforme',
        n: 3,
        forzato: false,
        generato: 'G',
        opera: 'TOMBINO TO59 - pk 7+624',
      },
      prelievi: [p('CLS 9159', 55.2, 51.7), p('CLS 9314', 62.5, 63.4), p('CLS 9406', 55.7, 59.9)],
    };
    const c = mappaControlloST36(cd, SOGLIE_DEFAULT);
    expect(c.righe).toHaveLength(3);
    expect(typeof c.righe[0].r1).toBe('number');
    expect(typeof c.rmin).toBe('number');
    expect(c.righe[0].denominazione).toBe(''); // Denominazione vuota
    expect(c.righe[0].ubicazione).toBe('scatolare fondazione'); // = parte
  });
});

describe('xlsxST36 — smoke (genera un .xlsx non vuoto, niente throw)', () => {
  it('produce un Blob dalla selezione (fasce, terzina merge, bordi, firma)', async () => {
    const cd: ControlloPerDoc = {
      ctrl: {
        id: 'k',
        wbs: 'TO59',
        tipo: 'A',
        rck: 40,
        prelieviIds: ['a', 'b', 'c'],
        esito: 'conforme',
        n: 3,
        forzato: false,
        generato: 'G',
        opera: 'TOMBINO SCATOLARE TO59 - pk 7+624',
      },
      prelievi: [p('CLS 9159', 55.2, 51.7), p('CLS 9314', 62.5, 63.4), p('CLS 9406', 55.7, 59.9)],
    };
    const blob = await generaXlsxST36({
      intestazione: 'S.S. n. 106 "Jonica"\nLavori 3° Megalotto',
      numeroScheda: 1,
      controlli: [mappaControlloST36(cd, SOGLIE_DEFAULT)],
    });
    expect(blob.size).toBeGreaterThan(1000);
  });
});
