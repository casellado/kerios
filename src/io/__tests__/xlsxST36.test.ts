import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Prelievo } from '../../core/index.ts';
import { SOGLIE_DEFAULT } from '../../core/index.ts';
import { mappaControlloST36, type ControlloPerDoc } from '../st36dati.ts';
import { generaXlsxST36 } from '../xlsxST36.ts';

// il template reale, letto da public/ (in runtime browser si fa fetch dell'URL).
const TEMPLATE = fileURLToPath(
  new URL('../../../public/Template_Controllo_accettazione_cls.xlsx', import.meta.url),
);
function templateBuffer(): ArrayBuffer {
  const b = readFileSync(TEMPLATE);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

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
const cd = (): ControlloPerDoc => ({
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
  // R medi: 53.45 · 62.95 · 57.80 → Rm = 58.0666… (caso arrotondamento), Rck eff = 54.57
  prelievi: [p('CLS 9159', 55.2, 51.7), p('CLS 9314', 62.5, 63.4), p('CLS 9406', 55.7, 59.9)],
});

describe('st36dati — mappa numerica + esito (per il semaforo)', () => {
  it('numeri (non stringhe) e Denominazione vuota; esito propagato', () => {
    const c = mappaControlloST36(cd(), SOGLIE_DEFAULT);
    expect(typeof c.righe[0].r1).toBe('number');
    expect(typeof c.rmin).toBe('number');
    expect(c.esito).toBe('conforme');
    expect(c.righe[0].denominazione).toBe('');
    expect(c.righe[0].ubicazione).toBe('scatolare fondazione');
  });
});

describe('xlsxST36 — COMPILA il template (formattazione preservata)', () => {
  async function genera() {
    const blob = await generaXlsxST36({
      intestazione: 'S.S. n. 106 "Jonica"\nLavori 3° Megalotto',
      numeroScheda: 1,
      controlli: [mappaControlloST36(cd(), SOGLIE_DEFAULT)],
      templateBuffer: templateBuffer(),
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    return wb.worksheets[0];
  }

  it('preserva impaginazione e griglia del template (print_area/landscape/merge)', async () => {
    const ws = await genera();
    expect(ws.pageSetup?.orientation).toBe('landscape');
    expect(ws.pageSetup?.printArea).toBe('A1:O30');
    const merges = (ws.model.merges ?? []).sort();
    expect(merges).toContain('A5:C5'); // fascia
    expect(merges).toContain('M7:M9'); // terzina
  });

  it('firma: Direttore Lavori in M27 se impostato; vuoto → cella vuota', async () => {
    const opts = {
      intestazione: 'Strada',
      numeroScheda: 1,
      controlli: [mappaControlloST36(cd(), SOGLIE_DEFAULT)],
      templateBuffer: templateBuffer(),
    };
    const conDl = await generaXlsxST36({ ...opts, direttoreLavori: 'Ing. Biagio Marra' });
    const wbA = new ExcelJS.Workbook();
    await wbA.xlsx.load(await conDl.arrayBuffer());
    expect(wbA.worksheets[0].getCell('M27').value).toBe('Ing. Biagio Marra');

    const senza = await generaXlsxST36(opts); // nessun DL
    const wbB = new ExcelJS.Workbook();
    await wbB.xlsx.load(await senza.arrayBuffer());
    const v = wbB.worksheets[0].getCell('M27').value;
    expect(v === '' || v == null).toBe(true);
  });

  it('scrive intestazione, opera/pk e i dati prelievo', async () => {
    const ws = await genera();
    expect(ws.getCell('A1').value).toContain('Jonica');
    expect(ws.getCell('A3').value).toBe('TOMBINO SCATOLARE TO59');
    expect(ws.getCell('E3').value).toBe('pk 7+624');
    expect(ws.getCell('C7').value).toBe('CLS 9159'); // verbale 1ª riga
    expect(ws.getCell('D7').value).toBe('scatolare fondazione'); // Ubicazione = parte
    expect(ws.getCell('E7').value === '' || ws.getCell('E7').value == null).toBe(true); // Denominazione vuota
  });

  it('valori ARROTONDATI (no 58,0666…): Rm=58.07, Rck eff=54.57 sulla terzina', async () => {
    const ws = await genera();
    expect(ws.getCell('M7').value).toBe(53.45); // Rmin
    expect(ws.getCell('N7').value).toBe(58.07); // Rm arrotondato (era 58.0666…)
    expect(ws.getCell('O7').value).toBe(54.57); // Rck eff
  });

  it('semaforo: fill verde sulla Rck eff per controllo CONFORME', async () => {
    const ws = await genera();
    const fill = ws.getCell('O7').fill as { fgColor?: { argb?: string } } | undefined;
    expect(fill?.fgColor?.argb).toBe('FFC6EFCE'); // verde chiaro
  });

  it('terzine NON usate (<6 controlli) = NEUTRE: nessun fill su A..O delle 3 righe', async () => {
    // 1 solo controllo → terzina 1 (R7-9) piena; terzine 2..6 (R10..R24) vuote/neutre.
    const blob = await generaXlsxST36({
      intestazione: 'Strada',
      numeroScheda: 1,
      controlli: [mappaControlloST36(cd(), SOGLIE_DEFAULT)],
      templateBuffer: templateBuffer(),
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.worksheets[0];
    // il template aveva verdino su O e grigio su qualche riga: ora azzerati.
    const pattern = (a: string) =>
      (ws.getCell(a).fill as { pattern?: string } | undefined)?.pattern ?? 'none';
    for (const a of ['O22', 'O23', 'O24', 'A23', 'M22', 'L24']) {
      expect(pattern(a)).toBe('none'); // 6ª terzina (e righe interne) senza alcun fill
    }
    // controllo: la terzina PIENA mantiene il semaforo
    expect((ws.getCell('O7').fill as { fgColor?: { argb?: string } })?.fgColor?.argb).toBe(
      'FFC6EFCE',
    );
  });
});
