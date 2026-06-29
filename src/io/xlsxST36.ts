/**
 * Generatore del documento ST36 in EXCEL (.xlsx) — formato NATIVO del controllo
 * reale del PO. Misure ESATTE dalla SPEC chirurgica del CTO (font, larghezze,
 * altezze, merge, bordi, formati numerici). Usa `exceljs` (bordi + grassetto +
 * merge, che SheetJS community NON scrive) con import() DINAMICO (code-split).
 *
 * Foglio "MORTO": valori NUMERICI congelati dall'engine (NON formule Excel).
 * Engine invariato — i dati arrivano già mappati da st36dati.ts.
 */
import type { ControlloST36 } from './st36dati.ts';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface OpzioniXlsxST36 {
  intestazione: string; // profilo (testo libero: R1 = riga 1, R2 = resto)
  numeroScheda: number;
  controlli: ControlloST36[]; // i controlli FLAGGATI (≤6)
}

const FONT = 'Open Sans';
const N_COL = 15; // A..O
// larghezze Excel (spec): A..O
const LARGHEZZE = [10.9, 4.9, 8.6, 14.6, 14.9, 13.6, 9.9, 9, 8.9, 5.9, 6, 6, 10.6, 10, 13.6];
// intestazioni R6 (F vuota: "Laboratorio" è la fascia F5:F6)
const INTEST_COLONNE = [
  'Data',
  'Rck',
  'Verbale',
  'Ubicazione',
  'Denominazione',
  '',
  'Certificato',
  'Data Prova',
  'Rott. a gg.',
  'R1',
  'R2',
  'R',
  'Rmin',
  'Rm',
  'Rck effettiva',
];

/** Genera il Blob .xlsx ST36 dai controlli scelti. */
export async function generaXlsxST36(opts: OpzioniXlsxST36): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ST36', { pageSetup: { orientation: 'landscape' } });
  ws.columns = LARGHEZZE.map((w) => ({ width: w }));

  type Stile = { bold?: boolean; size?: number; center?: boolean; numFmt?: string };
  const set = (r: number, c: number, val: string | number | null, st: Stile = {}) => {
    const cell = ws.getCell(r, c);
    cell.value = val == null ? '' : val;
    cell.font = { name: FONT, size: st.size ?? 8, bold: !!st.bold };
    cell.alignment = {
      horizontal: st.center ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    if (st.numFmt && typeof val === 'number') cell.numFmt = st.numFmt;
  };

  // --- Intestazione (R1-R3), FUORI dalla tabella, niente bordi ---
  const linee = opts.intestazione.split(/\r?\n/);
  ws.mergeCells(1, 1, 1, N_COL);
  set(1, 1, linee[0] ?? '', { bold: true, size: 12 });
  ws.mergeCells(2, 1, 2, N_COL);
  set(2, 1, linee.slice(1).join(' '), { bold: true, size: 12 });

  // R3: opera + pk (da ControlloSalvato.opera). pk in E3 se separabile, altrimenti tutto in A3.
  const opere = [
    ...new Set(opts.controlli.map((c) => c.opera?.trim()).filter(Boolean)),
  ] as string[];
  let operaA = '';
  let operaE = '';
  if (opere.length === 1) {
    const m = opere[0].match(/^(.*?)[\s·-]*(pk\b.*)$/i);
    if (m) {
      operaA = m[1].trim();
      operaE = m[2].trim();
    } else {
      operaA = opere[0];
    }
  } else if (opere.length > 1) {
    operaA = opere.join('  ·  ');
  }
  ws.mergeCells(3, 1, 3, 4);
  set(3, 1, operaA, { bold: true, size: 12 });
  ws.mergeCells(3, 5, 3, N_COL);
  set(3, 5, operaE, { bold: true, size: 12 });

  // altezze righe
  ws.getRow(1).height = 20;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 20;
  ws.getRow(4).height = 10; // R4 separatore sottile (vuoto)

  // --- Fasce di testata R5 (BOLD sz10, center, merge gruppi colonne) ---
  const tipi = new Set(opts.controlli.map((c) => c.tipo));
  const bandaControllo =
    tipi.size === 1
      ? `Controllo di accettazione "TIPO ${[...tipi][0]}"`
      : 'Controllo di accettazione';
  ws.mergeCells(5, 1, 5, 3);
  set(5, 1, 'PRELIEVO CAMPIONE', { bold: true, size: 10, center: true });
  ws.mergeCells(5, 4, 5, 5);
  set(5, 4, 'PARTE DI OPERA', { bold: true, size: 10, center: true });
  ws.mergeCells(5, 6, 6, 6); // F5:F6 (Laboratorio, unita verticale)
  set(5, 6, 'LABORATORIO', { bold: true, size: 10, center: true });
  ws.mergeCells(5, 7, 5, 12);
  set(5, 7, 'RISULTATI DELLE PROVE', { bold: true, size: 10, center: true });
  ws.mergeCells(5, 13, 5, 15);
  set(5, 13, bandaControllo, { bold: true, size: 10, center: true });
  ws.getRow(5).height = 20;

  // --- Intestazioni colonna R6 (BOLD sz8, center) ---
  INTEST_COLONNE.forEach((h, i) => {
    if (i === 5) return; // F6 vuota (parte della fascia F5:F6)
    set(6, i + 1, h, { bold: true, size: 8, center: true });
  });
  ws.getRow(6).height = 20;

  // --- Righe dati da R7; terzina M/N/O unita verticalmente su n righe (sz10) ---
  let row = 7;
  for (const c of opts.controlli) {
    const n = c.righe.length;
    const inizio = row;
    c.righe.forEach((rg, i) => {
      set(row, 1, rg.data, { center: true });
      set(row, 2, rg.rck, { center: true, numFmt: '0' });
      set(row, 3, rg.verbale, { center: true });
      set(row, 4, rg.ubicazione, { center: true });
      set(row, 5, rg.denominazione, { center: true });
      set(row, 6, rg.laboratorio, { center: true });
      set(row, 7, rg.certificato, { center: true });
      set(row, 8, rg.dataProva, { center: true });
      set(row, 9, rg.rottGg, { center: true, numFmt: '0' });
      set(row, 10, rg.r1, { center: true, numFmt: '0.0' });
      set(row, 11, rg.r2, { center: true, numFmt: '0.0' });
      set(row, 12, rg.r, { center: true, bold: true, numFmt: '0.00' });
      if (i === 0) {
        set(row, 13, c.rmin, { center: true, size: 10, numFmt: '0.00' });
        set(row, 14, c.rm, { center: true, size: 10, numFmt: '0.00' });
        set(row, 15, c.rckEff, { center: true, size: 10, bold: true, numFmt: '0.00' });
      }
      ws.getRow(row).height = 20;
      row += 1;
    });
    if (n > 1) {
      ws.mergeCells(inizio, 13, inizio + n - 1, 13);
      ws.mergeCells(inizio, 14, inizio + n - 1, 14);
      ws.mergeCells(inizio, 15, inizio + n - 1, 15);
    }
  }
  const tabFine = row - 1;

  // --- GRIGLIA: bordo sottile LRTB su OGNI cella della tabella (R5..tabFine),
  //     incluse le celle delle aree unite (fasce e terzina). ---
  const sottile = { style: 'thin' as const, color: { argb: 'FF000000' } };
  for (let r = 5; r <= tabFine; r += 1) {
    for (let cc = 1; cc <= N_COL; cc += 1) {
      ws.getCell(r, cc).border = { top: sottile, left: sottile, bottom: sottile, right: sottile };
    }
  }

  // --- Firma (merge M:O sotto la tabella, ~2 righe dopo) — NESSUN NOME ---
  const rFirma = tabFine + 3;
  ws.mergeCells(rFirma, 13, rFirma, 15);
  set(rFirma, 13, 'IL DIRETTORE LAVORI', { size: 10, center: true });
  ws.mergeCells(rFirma + 1, 13, rFirma + 1, 15);
  set(rFirma + 1, 13, '', { center: true }); // riga vuota per la firma a mano

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: XLSX_MIME });
}
