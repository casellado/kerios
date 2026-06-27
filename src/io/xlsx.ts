/**
 * Import del registro CLS da .xlsx (SheetJS). Stesso schema colonne del CSV →
 * riusa la mappatura per posizione di csv.ts (`righeToEsito`). Nessuna logica
 * duplicata: cambia solo come si ottengono le righe grezze.
 *
 * Nota dipendenza: `xlsx` installato dalla CDN ufficiale SheetJS (0.20.x) e non
 * dalla 0.18.5 di npm (che ha un advisory). Si leggono solo file LOCALI scelti
 * dall'utente.
 */
import * as XLSX from 'xlsx';
import { righeToEsito, type EsitoImportCls } from './csv.ts';

/** Parsing del primo foglio di un .xlsx → prelievi + errori. */
export function parseRegistroClsXlsx(bytes: Uint8Array): EsitoImportCls {
  const wb = XLSX.read(bytes, { type: 'array' });
  const nomeFoglio = wb.SheetNames[0];
  if (!nomeFoglio)
    return { prelievi: [], errori: ['Il file .xlsx non contiene fogli.'], totaleRighe: 0 };
  const ws = wb.Sheets[nomeFoglio];
  // header:1 → array di array (per posizione); raw:false → celle già formattate a stringa.
  const righe = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
  return righeToEsito(righe);
}
