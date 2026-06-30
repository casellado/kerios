import { describe, expect, it } from 'vitest';
import {
  parseRegistroAcciaioCsv,
  righeAcciaioToEsito,
  verificaImportAcciaio,
} from '../csvAcciaio.ts';
import type { PrelievoAcciaio } from '../../core/index.ts';

// Intestazione fedele al registro AC1 reale: ISPETTORE in col A (da IGNORARE),
// "Data" duplicate dopo i protocolli, 3 saggi su 3 colonne, typo "Allungameno"/
// "incrudimeto".
const HEADER = [
  'ISPETTORE',
  'WBS',
  'Verbale n.',
  'Data prelievo',
  'D.D.T.',
  "PARTE D'OPERA",
  'Produttore',
  'Ø mm',
  'Colata',
  'Prot. Rich. D.L.',
  'Data',
  'Protocollo Ricezione',
  'Data',
  'Laboratorio',
  'Data Prova',
  'Certificato',
  'Data',
  'Tensione snervamento fy [N/mm2]',
  '',
  '',
  'Allungameno Agt [%]',
  '',
  '',
  'Rapporto incrudimeto ft/fy',
  '',
  '',
  'NOTE',
  'Controllo di Accettazione',
  'Esito piega',
];
const RIGA = [
  'Rossi', // ISPETTORE → non importata
  'TO59',
  'AC1-1',
  '05/07/2024',
  'DDT123',
  'Sottovia - Fondazione',
  'FERRIERE NORD',
  '12',
  'COL-9',
  'PR-1',
  '01/07/2024',
  'PRZ-1',
  '02/07/2024',
  'SIDERCEM',
  '05/08/2024',
  'CERT-1',
  '06/08/2024',
  '500',
  '510',
  '520',
  '8',
  '9',
  '10',
  '1,2',
  '1,25',
  '1,3',
  'nota x',
  '=FORMULA()', // colonna esito Excel → IGNORATA
  'Positivo',
];

describe('io/csvAcciaio — mappatura per intestazione', () => {
  it('mappa una riga: 3 saggi come terne, date risolte, SENZA ispettore', () => {
    const { prelievi } = righeAcciaioToEsito([HEADER, RIGA]);
    expect(prelievi).toHaveLength(1);
    const p = prelievi[0];
    expect(p.id).toBe('TO59|AC1-1');
    expect(p.verbale).toBe('AC1-1');
    expect(p.diametro).toBe(12);
    expect(p.produttore).toBe('FERRIERE NORD');
    expect(p.parte).toBe('Sottovia - Fondazione');
    // 3 saggi → terna numerica
    expect(p.fy).toEqual([500, 510, 520]);
    expect(p.agt).toEqual([8, 9, 10]);
    expect(p.ftfy).toEqual([1.2, 1.25, 1.3]);
    expect(p.piega).toBe('Positivo');
    // date adiacenti ai protocolli risolte per posizione
    expect(p.protRichiestaDL).toBe('PR-1');
    expect(p.dataRichiestaDL).toBe('01/07/2024');
    expect(p.protRicezione).toBe('PRZ-1');
    expect(p.dataRicezione).toBe('02/07/2024');
    expect(p.certificato).toBe('CERT-1');
    expect(p.dataCertificato).toBe('06/08/2024');
    expect(p.dataProva).toBe('05/08/2024');
    // l'ISPETTORE non deve comparire in NESSUN campo
    expect(JSON.stringify(p)).not.toContain('Rossi');
  });

  it('idempotenza: stesso wbs|verbale → stesso id (bulkPut sovrascrive, non duplica)', () => {
    const { prelievi } = righeAcciaioToEsito([HEADER, RIGA, RIGA]);
    expect(prelievi[0].id).toBe(prelievi[1].id);
  });

  it('intestazione assente → errore esplicito, nessun prelievo', () => {
    const esito = righeAcciaioToEsito([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
    expect(esito.prelievi).toHaveLength(0);
    expect(esito.errori[0]).toMatch(/intestazione/i);
  });

  it('CSV reale (cp1252, «;», con Ø) → parsing completo', () => {
    const testo = [HEADER, RIGA].map((r) => r.join(';')).join('\n');
    const bytes = new Uint8Array(Buffer.from(testo, 'latin1')); // cp1252 ≈ latin1 per Ø
    const { prelievi } = parseRegistroAcciaioCsv(bytes);
    expect(prelievi).toHaveLength(1);
    expect(prelievi[0].diametro).toBe(12);
  });
});

describe('io/csvAcciaio — guardia prefisso (duale del cls)', () => {
  const acc = (verbale: string): PrelievoAcciaio => ({
    id: `W|${verbale}`,
    wbs: 'W',
    verbale,
    data: '',
    produttore: '',
    diametro: 12,
    fy: [0, 0, 0],
    agt: [0, 0, 0],
    ftfy: [0, 0, 0],
    piega: '',
  });

  it('accetta verbali AC1', () => {
    expect(verificaImportAcciaio([acc('AC1-1')]).accettato).toBe(true);
  });
  it('rifiuta un file di CALCESTRUZZO (CLS)', () => {
    const v = verificaImportAcciaio([acc('CLS-1')]);
    expect(v.accettato).toBe(false);
    expect(v.messaggio).toMatch(/calcestruzzo/i);
  });
  it('rifiuta un file senza verbali AC1', () => {
    expect(verificaImportAcciaio([acc('XYZ-1')]).accettato).toBe(false);
  });
});
