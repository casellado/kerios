/**
 * Export ST36 ACCIAIO (.xlsx) — COMPILA il template, come il cls. Gemello di
 * io/xlsxST36.ts: apre public/Template_Controllo_accettazione_acciaio.xlsx (layout/
 * impaginazione/print_area A1:Q28/fasce/bordi già perfetti) e scrive SOLO i dati.
 *
 * 1 riga per prelievo (R7..R24 = max 18, niente terzine). I 4 esiti (fy/Agt/ft·fy/
 * piega) sono VALORI FISSI calcolati dall'engine (domain/acciaio), NON le formule
 * del template. Semaforo verde/rosso su ciascuna cella esito. exceljs import
 * DINAMICO (code-split). impostaFill con stile FRESCO per cella (il template
 * condivide un fill verdino sulle colonne esito → mutarlo muterebbe tutte le celle).
 */
import type { DocumentoST36Acciaio } from './st36datiAcciaio.ts';
import type { EsitoParam } from '../domain/index.ts';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const TEMPLATE_URL = '/Template_Controllo_accettazione_acciaio.xlsx';

const VERDE = 'FFC6EFCE';
const ROSSO = 'FFFFC7CE';
const RIGA0 = 7; // prima riga dati (R7)
const MAX_RIGHE = 18; // R7..R24
const N_COL = 17; // A..Q

export interface OpzioniXlsxAcciaioST36 {
  intestazione: string;
  numeroScheda: number;
  documento: DocumentoST36Acciaio;
  /** Direttore Lavori (dal profilo): scritto in O27, sotto "IL DIRETTORE LAVORI". */
  direttoreLavori?: string;
  /** buffer del template (per i test); se assente si fa fetch dell'URL statico. */
  templateBuffer?: ArrayBuffer;
}

type Cella = { style: object; fill: object };
// stile FRESCO per cella → cambia il fill solo di quella (bordi/font/numFmt preservati).
const impostaFill = (cell: Cella, fill: object): void => {
  cell.style = { ...cell.style, fill };
};
const FILL_VUOTO = { type: 'pattern', pattern: 'none' } as const;
const r2 = (x: number | null): number | null => (x == null ? null : Math.round(x * 100) / 100);

const fillEsito = (e: EsitoParam): object => {
  if (e === 'Positivo') return { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
  if (e === 'Negativo') return { type: 'pattern', pattern: 'solid', fgColor: { argb: ROSSO } };
  return FILL_VUOTO; // incompleto → neutro
};
const testoEsito = (e: EsitoParam): string => (e === 'incompleto' ? '' : e);

async function caricaTemplate(): Promise<ArrayBuffer> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error(`Template ST36 acciaio non trovato (HTTP ${res.status}).`);
  return res.arrayBuffer();
}

/** Compila il template ST36 acciaio coi prelievi della scheda → Blob .xlsx. */
export async function generaXlsxAcciaioST36(opts: OpzioniXlsxAcciaioST36): Promise<Blob> {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? (mod as unknown as typeof mod.default);
  const buf = opts.templateBuffer ?? (await caricaTemplate());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Template ST36 acciaio: foglio non trovato.');

  // intestazione (celle già formattate): solo testo
  const linee = opts.intestazione.split(/\r?\n/);
  ws.getCell('A1').value = linee[0] ?? '';
  ws.getCell('A2').value = linee.slice(1).join(' ');
  const opera = opts.documento.opera;
  if (opera) {
    const m = opera.match(/^(.*?)[\s·-]*(pk\b.*)$/i);
    if (m) {
      ws.getCell('A3').value = m[1].trim();
      ws.getCell('E3').value = m[2].trim();
    } else {
      ws.getCell('A3').value = opera;
    }
  }

  // Firma: il nome del Direttore Lavori in O27 (sotto "IL DIRETTORE LAVORI" in O26,
  // area unita O27:Q27). Solo se impostato; vuoto → cella firma vuota come prima.
  const dl = opts.direttoreLavori?.trim();
  if (dl) ws.getCell('O27').value = dl;

  // righe dati: 1 per prelievo (max 18)
  const righe = opts.documento.righe.slice(0, MAX_RIGHE);
  righe.forEach((rg, i) => {
    const r = RIGA0 + i;
    ws.getCell(r, 1).value = rg.verbale; // A
    ws.getCell(r, 2).value = rg.data; // B
    ws.getCell(r, 3).value = rg.diametro; // C = Ø
    ws.getCell(r, 4).value = rg.produttore; // D
    ws.getCell(r, 5).value = rg.ubicazione; // E
    ws.getCell(r, 6).value = rg.denominazione; // F
    ws.getCell(r, 7).value = rg.laboratorio; // G
    ws.getCell(r, 8).value = rg.certificato; // H
    ws.getCell(r, 9).value = rg.dataProva; // I = data fine prove
    ws.getCell(r, 10).value = r2(rg.fy); // J
    ws.getCell(r, 11).value = r2(rg.agt); // K
    ws.getCell(r, 12).value = r2(rg.ftfy); // L
    ws.getCell(r, 13).value = rg.piega; // M
    // N/O/P/Q = 4 esiti calcolati (valori fissi) + semaforo
    const esiti: EsitoParam[] = [rg.esitoFy, rg.esitoAgt, rg.esitoFtfy, rg.esitoPiega];
    esiti.forEach((e, j) => {
      const c = ws.getCell(r, 14 + j) as unknown as Cella & { value: unknown };
      c.value = testoEsito(e);
      impostaFill(c, fillEsito(e));
    });
  });

  // righe non usate (<18): neutralizza il fill (il template ha verdino sulle colonne
  // esito) su tutte le celle A..Q → righe vuote e NEUTRE, print_area invariata.
  for (let i = righe.length; i < MAX_RIGHE; i += 1) {
    const r = RIGA0 + i;
    for (let cc = 1; cc <= N_COL; cc += 1) {
      impostaFill(ws.getCell(r, cc) as unknown as Cella, FILL_VUOTO);
    }
  }

  const out = await wb.xlsx.writeBuffer();
  return new Blob([out], { type: XLSX_MIME });
}
