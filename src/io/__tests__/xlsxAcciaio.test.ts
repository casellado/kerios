import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseRegistroAcciaioXlsx } from '../xlsxAcciaio.ts';

// header compatto che QUALIFICA come registro (Verbale + WBS/Produttore/Ø/fy).
const HEADER = [
  'WBS',
  'Verbale n.',
  'Data prelievo',
  'Produttore',
  'Ø mm',
  'Colata',
  'Tensione snervamento fy [N/mm2]',
  '',
  '',
  'Allungameno Agt [%]',
  '',
  '',
  'Rapporto incrudimeto ft/fy',
  '',
  '',
  'Esito piega',
];
const RIGA = [
  'TO59',
  'AC1-1',
  '05/07/2024',
  'FERRIERE NORD',
  '12',
  'COL-9',
  '500',
  '510',
  '520',
  '8',
  '9',
  '10',
  '1,2',
  '1,25',
  '1,3',
  'Positivo',
];

function xlsxDaFogli(fogli: { nome: string; righe: unknown[][] }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const f of fogli) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(f.righe), f.nome);
  }
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('io/xlsxAcciaio — selezione foglio in xlsx multi-foglio', () => {
  it('sceglie «Registro AC1», ignora Copertina e «correzioni da fare»', () => {
    const bytes = xlsxDaFogli([
      { nome: 'Copertina', righe: [['Registro Prelievi Acciaio'], ['']] },
      { nome: 'Registro AC1', righe: [HEADER, RIGA] },
      // ha «Verbale» ma solo NOTE → NON è il registro dei prelievi
      {
        nome: 'correzioni da fare',
        righe: [
          ['Verbale n.', 'NOTE'],
          ['AC1-9', 'due Ø sulla stessa riga'],
        ],
      },
    ]);
    const { prelievi } = parseRegistroAcciaioXlsx(bytes);
    expect(prelievi).toHaveLength(1);
    expect(prelievi[0].verbale).toBe('AC1-1');
    expect(prelievi[0].diametro).toBe(12);
  });

  it('xlsx single-foglio continua a funzionare', () => {
    const bytes = xlsxDaFogli([{ nome: 'Foglio1', righe: [HEADER, RIGA, RIGA] }]);
    const { prelievi } = parseRegistroAcciaioXlsx(bytes);
    expect(prelievi).toHaveLength(2);
  });

  it('nessun foglio-registro → messaggio chiaro, nessun prelievo', () => {
    const bytes = xlsxDaFogli([
      { nome: 'Copertina', righe: [['x'], ['']] },
      {
        nome: 'correzioni',
        righe: [
          ['Verbale n.', 'NOTE'],
          ['AC1-9', 'nota'],
        ],
      },
    ]);
    const esito = parseRegistroAcciaioXlsx(bytes);
    expect(esito.prelievi).toHaveLength(0);
    expect(esito.errori[0]).toMatch(/nessun foglio/i);
  });
});
