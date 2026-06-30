import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PrelievoAcciaio, Terna } from '../../core/index.ts';
import { raggruppaInSchedeAcciaio } from '../../domain/index.ts';
import { mappaPrelievoST36Acciaio, mappaSchedaST36Acciaio } from '../st36datiAcciaio.ts';
import { generaXlsxAcciaioST36 } from '../xlsxAcciaioST36.ts';

const TEMPLATE = fileURLToPath(
  new URL('../../../public/Template_Controllo_accettazione_acciaio.xlsx', import.meta.url),
);
function templateBuffer(): ArrayBuffer {
  const b = readFileSync(TEMPLATE);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

function prelievo(over: Partial<PrelievoAcciaio> = {}): PrelievoAcciaio {
  return {
    id: over.id ?? 'TO59|AC1-1',
    wbs: 'TO59',
    verbale: 'AC1-1',
    data: '05/07/2024',
    produttore: 'FERRIERE NORD',
    diametro: 12,
    opera: 'TOMBINO TO59 - pk 7+624',
    laboratorio: 'SIDERCEM',
    certificato: 'CERT-1',
    dataProva: '05/08/2024',
    fy: [500, 510, 520] as Terna,
    agt: [8, 9, 10] as Terna,
    ftfy: [1.2, 1.25, 1.3] as Terna,
    piega: 'Positivo',
    ...over,
  };
}

describe('st36datiAcciaio — valore CRITICO in cella, esito su tutti e 3', () => {
  it('fy/Agt = minimo; ft/fy = più sfavorevole; esiti calcolati', () => {
    const r = mappaPrelievoST36Acciaio(prelievo());
    expect(r.fy).toBe(500); // min(500,510,520)
    expect(r.agt).toBe(8); // min(8,9,10)
    expect(r.ftfy).toBe(1.2); // tutti dentro → minimo
    expect(r.esitoFy).toBe('Positivo');
  });

  it('ft/fy con un valore <1,13 → cella = quel minimo, esito Negativo', () => {
    const r = mappaPrelievoST36Acciaio(prelievo({ ftfy: [1.1, 1.2, 1.3] }));
    expect(r.ftfy).toBe(1.1); // più sfavorevole (sotto soglia)
    expect(r.esitoFtfy).toBe('Negativo');
  });

  it('ft/fy con un valore >1,37 → cella = quel massimo', () => {
    const r = mappaPrelievoST36Acciaio(prelievo({ ftfy: [1.2, 1.4, 1.25] }));
    expect(r.ftfy).toBe(1.4);
    expect(r.esitoFtfy).toBe('Negativo');
  });
});

describe('domain — raggruppaInSchedeAcciaio (≤18, chiave SOLA WBS)', () => {
  it('una WBS con Ø/produttori MISTI → UNA famiglia, chunk 18+18+4 (non spezza per Ø/produttore)', () => {
    const quaranta = Array.from({ length: 40 }, (_, i) =>
      prelievo({
        id: `p${i}`,
        verbale: `AC1-${i}`,
        diametro: i % 2 === 0 ? 12 : 16,
        produttore: i % 3 === 0 ? 'FERRIERE NORD' : 'STEFANA',
      }),
    );
    const schede = raggruppaInSchedeAcciaio(quaranta);
    expect(schede.map((s) => s.prelieviIds.length)).toEqual([18, 18, 4]);
    expect(schede.every((s) => s.wbs === 'TO59')).toBe(true);
  });

  it('dentro la scheda i campioni sono ordinati per Ø → produttore → verbale', () => {
    const grezzi = [
      prelievo({ id: 'a', verbale: 'AC1-3', diametro: 16, produttore: 'STEFANA' }),
      prelievo({ id: 'b', verbale: 'AC1-1', diametro: 12, produttore: 'STEFANA' }),
      prelievo({ id: 'c', verbale: 'AC1-2', diametro: 12, produttore: 'FERRIERE NORD' }),
    ];
    const [scheda] = raggruppaInSchedeAcciaio(grezzi);
    // Ø12 prima di Ø16; entro Ø12, FERRIERE NORD prima di STEFANA
    expect(scheda.prelieviIds).toEqual(['c', 'b', 'a']);
  });

  it('la COLATA non incide (resta tracciabilità del prelievo)', () => {
    const a = prelievo({ id: 'a', verbale: 'AC1-1', colata: 'COL-1' });
    const b = prelievo({ id: 'b', verbale: 'AC1-2', colata: 'COL-2' });
    expect(raggruppaInSchedeAcciaio([a, b])).toHaveLength(1); // stessa WBS
  });

  it('WBS diverse → schede separate per WBS', () => {
    const a = prelievo({ id: 'a', wbs: 'TO59', verbale: 'AC1-1' });
    const b = prelievo({ id: 'b', wbs: 'TO60', verbale: 'AC1-2' });
    const schede = raggruppaInSchedeAcciaio([a, b]);
    expect(schede).toHaveLength(2);
    expect(new Set(schede.map((s) => s.wbs))).toEqual(new Set(['TO59', 'TO60']));
  });

  it('esclude i prelievi incompleti (saggi mancanti)', () => {
    const incompleto = prelievo({ id: 'x', fy: [Number.NaN, Number.NaN, Number.NaN] });
    expect(raggruppaInSchedeAcciaio([incompleto])).toHaveLength(0);
  });
});

describe('xlsxAcciaioST36 — COMPILA il template', () => {
  async function genera(prelievi: PrelievoAcciaio[]) {
    const blob = await generaXlsxAcciaioST36({
      intestazione: 'S.S. n. 106 "Jonica"\nLavori 3° Megalotto',
      numeroScheda: 1,
      documento: mappaSchedaST36Acciaio(prelievi),
      templateBuffer: templateBuffer(),
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    return wb.worksheets[0];
  }

  it('preserva impaginazione (print_area Q28/landscape/merge) e scrive testata+opera', async () => {
    const ws = await genera([prelievo()]);
    expect(ws.pageSetup?.orientation).toBe('landscape');
    expect(ws.pageSetup?.printArea).toBe('A1:Q28');
    const merges = (ws.model.merges ?? []).sort();
    expect(merges).toContain('A5:D5');
    expect(merges).toContain('N5:Q5');
    expect(ws.getCell('A1').value).toContain('Jonica');
    expect(ws.getCell('A3').value).toBe('TOMBINO TO59');
    expect(ws.getCell('E3').value).toBe('pk 7+624');
  });

  it('1 riga per prelievo: valori critici + 4 esiti col semaforo', async () => {
    const ws = await genera([
      prelievo({ id: 'a', verbale: 'AC1-1' }),
      prelievo({ id: 'b', verbale: 'AC1-2', fy: [400, 500, 510] }), // fy fuori → Negativo
    ]);
    // riga 1 (R7) conforme
    expect(ws.getCell('A7').value).toBe('AC1-1');
    expect(ws.getCell('C7').value).toBe(12); // Ø
    expect(ws.getCell('J7').value).toBe(500); // fy minimo
    expect(ws.getCell('N7').value).toBe('Positivo');
    const fillN7 = ws.getCell('N7').fill as { fgColor?: { argb?: string } };
    expect(fillN7.fgColor?.argb).toBe('FFC6EFCE'); // verde
    // riga 2 (R8) fy Negativo → rosso
    expect(ws.getCell('N8').value).toBe('Negativo');
    const fillN8 = ws.getCell('N8').fill as { fgColor?: { argb?: string } };
    expect(fillN8.fgColor?.argb).toBe('FFFFC7CE'); // rosso
  });

  it('righe non usate (<18) = NEUTRE: nessun fill sulle colonne esito', async () => {
    const ws = await genera([prelievo()]); // 1 solo prelievo → R8..R24 vuote
    const pattern = (a: string) =>
      (ws.getCell(a).fill as { pattern?: string } | undefined)?.pattern ?? 'none';
    for (const a of ['N8', 'Q8', 'N24', 'Q24']) {
      expect(pattern(a)).toBe('none');
    }
  });
});
