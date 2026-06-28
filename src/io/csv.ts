/**
 * Import del registro CLS da CSV reale (ANAS). Strato io.
 *
 * Insidie REALI gestite (verificate sul file `Registro_CLS_ST11.csv`):
 *  1. ENCODING Windows-1252 (non UTF-8): si legge come byte e si decodifica con
 *     TextDecoder('windows-1252') — best practice 2026.
 *  2. Separatore ';' (la virgola è il separatore DECIMALE).
 *  3. Decimali con VIRGOLA: "23,3" → 23.3 (parseNumeroIt).
 *  4. Date gg/mm/aaaa: restano stringhe; il dominio le interpreta (date.ts).
 *  5. Header con due colonne "DATA" DUPLICATE → mappatura per POSIZIONE (indice),
 *     non per nome.
 *  6. Sigla storica "CLS 5607" (spazio) oltre alla nuova "CLS/1": entrambe ok.
 *  7. WBS con spazio in coda "ST11 " → trim.
 *  8/9. Campi fase 2/3 e R1/R2 possono mancare → stato derivato, degrada con grazia.
 */
import Papa from 'papaparse';
import type { Prelievo } from '../core/index.ts';
import { parseNumeroIt } from './formato.ts';

/** Decodifica byte cp1252 → stringa JS. */
export function decodeCp1252(bytes: Uint8Array): string {
  return new TextDecoder('windows-1252').decode(bytes);
}

/** Indici di colonna del registro CLS (per POSIZIONE — vedi roadmap appendice). */
const COL = {
  verbale: 0,
  data: 1,
  wbs: 2,
  parte: 3,
  ddt: 4,
  impianto: 5,
  mix: 6,
  protRichiesta: 7,
  dataRichiesta: 8,
  protRicezione: 9,
  dataRicezione: 10,
  certificato: 11,
  dataCertificato: 12,
  laboratorio: 13,
  dataProva: 14,
  rck: 15,
  r1: 16,
  r2: 17,
  rmedio: 18,
  note: 19,
} as const;

export interface EsitoImportCls {
  prelievi: Prelievo[];
  /** righe scartate o con anomalie, con il motivo. */
  errori: string[];
  /** righe dati totali (escluso header). */
  totaleRighe: number;
}

function val(cells: string[], i: number): string | undefined {
  const v = cells[i]?.trim();
  return v ? v : undefined;
}

/** opzionale solo se definito (rispetta exactOptionalPropertyTypes). */
function assegna<T extends object, K extends string, V>(o: T, k: K, v: V | undefined): void {
  if (v !== undefined) (o as Record<string, unknown>)[k] = v;
}

/** Mappa UNA riga (array di celle per posizione) → Prelievo, o null se inutilizzabile. */
export function mapRigaCls(cells: string[]): { prelievo: Prelievo | null; errore?: string } {
  const verbale = val(cells, COL.verbale);
  const wbs = val(cells, COL.wbs)?.trim();
  if (!verbale) return { prelievo: null, errore: 'riga senza VERBALE → scartata' };

  const p: Prelievo = {
    id: `${wbs ?? ''}|${verbale}`,
    verbale,
    data: val(cells, COL.data) ?? '',
    wbs: wbs ?? '',
    parte: val(cells, COL.parte) ?? '',
    rck: parseNumeroIt(cells[COL.rck]) ?? Number.NaN,
    mix: val(cells, COL.mix) ?? '',
  };
  assegna(p, 'ddt', val(cells, COL.ddt));
  assegna(p, 'impianto', val(cells, COL.impianto));
  assegna(p, 'note', val(cells, COL.note));
  assegna(p, 'protRichiesta', val(cells, COL.protRichiesta));
  assegna(p, 'dataRichiesta', val(cells, COL.dataRichiesta));
  assegna(p, 'protRicezione', val(cells, COL.protRicezione));
  assegna(p, 'dataRicezione', val(cells, COL.dataRicezione));
  assegna(p, 'certificato', val(cells, COL.certificato));
  assegna(p, 'dataCertificato', val(cells, COL.dataCertificato));
  assegna(p, 'laboratorio', val(cells, COL.laboratorio));
  assegna(p, 'dataProva', val(cells, COL.dataProva));
  assegna(p, 'r1', parseNumeroIt(cells[COL.r1]));
  assegna(p, 'r2', parseNumeroIt(cells[COL.r2]));

  return { prelievo: p };
}

function isRigaHeader(cells: string[]): boolean {
  const c0 = cells[0]?.trim().toUpperCase() ?? '';
  return c0.includes('VERBALE');
}

/**
 * Mappa righe grezze (array di celle per posizione) → prelievi + errori.
 * Condivisa tra CSV e XLSX: la differenza è SOLO come si ottengono le righe.
 * Salta la riga di intestazione; le celle sono forzate a stringa (xlsx dà numeri).
 */
export function righeToEsito(righe: unknown[][]): EsitoImportCls {
  const prelievi: Prelievo[] = [];
  const errori: string[] = [];
  let totaleRighe = 0;

  for (const riga of righe) {
    if (!Array.isArray(riga)) continue;
    const cells = riga.map((c) => (c == null ? '' : String(c)));
    if (cells.every((c) => c.trim() === '')) continue;
    if (isRigaHeader(cells)) continue;
    totaleRighe += 1;
    const { prelievo, errore } = mapRigaCls(cells);
    if (prelievo) prelievi.push(prelievo);
    if (errore) errori.push(`Riga ${totaleRighe}: ${errore}`);
  }
  return { prelievi, errori, totaleRighe };
}

/** Parsing completo del CSV (byte cp1252) → prelievi + errori. */
export function parseRegistroClsCsv(bytes: Uint8Array): EsitoImportCls {
  const testo = decodeCp1252(bytes);
  const out = Papa.parse<string[]>(testo, {
    delimiter: ';',
    skipEmptyLines: 'greedy',
  });
  const esito = righeToEsito(out.data);
  for (const e of out.errors) {
    esito.errori.push(`Parser: ${e.message} (riga ${e.row ?? '?'})`);
  }
  return esito;
}
