import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Prelievo } from '../../core/index.ts';
import { parseRegistroClsCsv, righeToEsito, verificaImportCls } from '../csv.ts';
import { resistenzaPrelievo, statoPrelievo } from '../../domain/index.ts';

// Legge il file REALE del PO (byte grezzi, senza assumere encoding).
const CSV = fileURLToPath(
  new URL('../../../reference/dati-reali/Registro_CLS_ST11.csv', import.meta.url),
);
const bytes = new Uint8Array(readFileSync(CSV));
const esito = parseRegistroClsCsv(bytes);
const byVerbale = (v: string) => esito.prelievi.find((p) => p.verbale === v)!;

describe('parseRegistroClsCsv — file reale Registro_CLS_ST11.csv', () => {
  it('importa 22 prelievi (header escluso)', () => {
    expect(esito.prelievi).toHaveLength(22);
  });

  it('ENCODING Windows-1252: il "°" è decodificato (1°Concio)', () => {
    const p = byVerbale('CLS 5683');
    expect(p.parte).toContain('1°Concio');
    expect(p.parte).not.toContain('�'); // niente carattere di sostituzione
  });

  it('WBS con spazio in coda → trim ("ST11 " → "ST11")', () => {
    expect(byVerbale('CLS 5607').wbs).toBe('ST11');
  });

  it('decimali con VIRGOLA → numero (R2 "23,3" → 23.3)', () => {
    const p = byVerbale('CLS 5607');
    expect(p.r1).toBe(24);
    expect(p.r2).toBeCloseTo(23.3, 10);
  });

  it('colonne DATA duplicate mappate per POSIZIONE (richiesta ≠ prova)', () => {
    const p = byVerbale('CLS 5607');
    expect(p.dataRichiesta).toBe('20/07/2023'); // idx 8
    expect(p.dataCertificato).toBe('28/08/2023'); // idx 12
    expect(p.dataProva).toBe('10/08/2023'); // idx 14
  });

  it('mappa i campi anagrafici giusti', () => {
    const p = byVerbale('CLS 5607');
    expect(p.mix).toBe('PP01R15X0S4IF - 07-33/2022');
    expect(p.laboratorio).toBe('SIDERCEM');
    expect(p.certificato).toBe('621663');
    expect(p.rck).toBe(15);
    expect(p.ddt).toBe('1474');
  });

  it('R medio RICALCOLATO da R1,R2 a precisione piena (23,65; il registro arrotonda a 23,7)', () => {
    // dominio §3: NON fidarsi del valore CSV (arrotondato). 23,65 ≠ 23,7 per arrotondamento.
    expect(resistenzaPrelievo(byVerbale('CLS 5607'))).toBeCloseTo(23.65, 10);
    expect(resistenzaPrelievo(byVerbale('CLS 5683'))).toBeCloseTo(52.75, 10); // registro: 52,8
  });

  it('sigla storica con spazio ("CLS 5607") conservata come verbale', () => {
    expect(byVerbale('CLS 5607').verbale).toBe('CLS 5607');
  });

  it('prelievi del file reale sono refertati (hanno R1,R2,certificato)', () => {
    expect(statoPrelievo(byVerbale('CLS 5607'))).toBe('refertato');
  });

  it('nessun errore di parsing sul file reale', () => {
    expect(esito.errori).toEqual([]);
    expect(esito.totaleRighe).toBe(22);
  });
});

describe('righeToEsito — robustezza mappatura (anche XLSX che dà numeri)', () => {
  it('forza a stringa celle numeriche e salta header + righe vuote', () => {
    const righe: unknown[][] = [
      ['VERBALE DL', 'DATA VERBALE DL', 'WBS'], // header → saltato
      [
        'CLS/9',
        '01/02/2024',
        'ST11 ',
        'Parte X',
        '',
        '',
        'MIXY',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        40,
        45,
        44,
      ],
      ['', '', ''], // vuota → saltata
    ];
    const e = righeToEsito(righe);
    expect(e.prelievi).toHaveLength(1);
    expect(e.prelievi[0].rck).toBe(40);
    expect(e.prelievi[0].r1).toBe(45);
    expect(e.prelievi[0].wbs).toBe('ST11');
  });

  it('riga senza verbale → scartata con errore', () => {
    const e = righeToEsito([['', '01/01/2024', 'ST11']]);
    expect(e.prelievi).toHaveLength(0);
    expect(e.errori.length).toBe(1);
  });
});

describe('verificaImportCls — guardia prefisso (CLS vs AC1)', () => {
  const pr = (verbale: string): Prelievo => ({
    id: verbale,
    verbale,
    data: '01/01/2024',
    wbs: 'ST11',
    parte: 'F',
    rck: 40,
    mix: 'MX',
  });

  it('registro CALCESTRUZZO (CLS) → accettato (entra come prima)', () => {
    expect(verificaImportCls([pr('CLS 5607'), pr('CLS 5683')]).accettato).toBe(true);
  });

  it('registro ACCIAIO (AC1) caricato qui → RIFIUTATO, messaggio chiaro', () => {
    const v = verificaImportCls([pr('AC1-0001'), pr('AC1-0002')]);
    expect(v.accettato).toBe(false);
    expect(v.messaggio).toMatch(/acciaio/i);
  });

  it('un solo AC1 in mezzo a CLS → comunque rifiutato (file sbagliato)', () => {
    expect(verificaImportCls([pr('CLS 1'), pr('AC1-0001')]).accettato).toBe(false);
  });

  it('nessun verbale CLS (file estraneo/vuoto) → rifiutato', () => {
    expect(verificaImportCls([pr('XYZ 1')]).accettato).toBe(false);
    expect(verificaImportCls([]).accettato).toBe(false);
  });
});
