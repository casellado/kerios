/**
 * Import del registro ACCIAIO da .xlsx (SheetJS). Riusa il mapper per intestazione
 * di csvAcciaio.ts (`righeAcciaioToEsito`): cambia solo come si ottengono le righe.
 * Si leggono solo file LOCALI scelti dall'utente.
 *
 * SELEZIONE FOGLIO: i file reali sono MULTI-FOGLIO (Copertina vuota, "Registro AC1"
 * vero, "correzioni da fare" di note). NON si prende ciecamente il primo foglio: si
 * sceglie per CONTENUTO il foglio il cui header ha le colonne del registro
 * (Verbale + WBS/Produttore/Ø/fy), preferendo quello con più righe e, a parità, il
 * foglio chiamato "Registro".
 */
import * as XLSX from 'xlsx';
import { righeAcciaioToEsito, valutaFoglioAcciaio, type EsitoImportAcciaio } from './csvAcciaio.ts';

function righeFoglio(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
}

/** Parsing del registro acciaio in un .xlsx (sceglie il foglio giusto) → prelievi + errori. */
export function parseRegistroAcciaioXlsx(bytes: Uint8Array): EsitoImportAcciaio {
  const wb = XLSX.read(bytes, { type: 'array' });
  if (wb.SheetNames.length === 0)
    return { prelievi: [], errori: ['Il file .xlsx non contiene fogli.'], totaleRighe: 0 };

  let scelto: { nome: string; righe: unknown[][]; righeDati: number } | null = null;
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome];
    if (!ws) continue;
    const righe = righeFoglio(ws);
    const v = valutaFoglioAcciaio(righe);
    if (!v.idoneo) continue; // scarta Copertina, "correzioni da fare", ecc.
    const nomeRegistro = /registro/i.test(nome);
    const meglio =
      !scelto ||
      v.righeDati > scelto.righeDati ||
      (v.righeDati === scelto.righeDati && nomeRegistro && !/registro/i.test(scelto.nome));
    if (meglio) scelto = { nome, righe, righeDati: v.righeDati };
  }

  if (!scelto) {
    return {
      prelievi: [],
      errori: [
        'Nessun foglio con le colonne del registro AC1 (Verbale + WBS/Produttore/Ø): controlla il file.',
      ],
      totaleRighe: 0,
    };
  }
  return righeAcciaioToEsito(scelto.righe);
}
