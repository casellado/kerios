/**
 * Export ST36 (.xlsx) — COMPILA il template, non lo costruisce da zero.
 *
 * Il template `public/Template_Controllo_accettazione_cls.xlsx` ha già layout,
 * impaginazione (A4 landscape, print_area A1:O30, margini), fasce, 6 blocchi-
 * terzina (merge), bordi e formati numerici. Qui si APRE il template e si
 * SCRIVONO SOLO I DATI, preservando tutta la formattazione (verificato: exceljs
 * conserva print_area/orientamento/margini/merge/bordi/numFmt nel ciclo
 * load → scrivi → writeBuffer).
 *
 * exceljs con import() DINAMICO (code-split). Engine INVARIATO: i dati arrivano
 * già mappati da st36dati.ts; qui si ARROTONDA solo il valore scritto (l'engine
 * resta a piena precisione) per evitare 53,5999… al posto di 53,60.
 */
import type { ControlloST36 } from './st36dati.ts';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** URL statico del template (servito da Vite da public/, dev e build). */
export const TEMPLATE_URL = '/Template_Controllo_accettazione_cls.xlsx';

// semaforo esito (fill solido sulla Rck eff): verde conforme / rosso non conforme.
const VERDE = 'FFC6EFCE';
const ROSSO = 'FFFFC7CE';

type Cella = { style: object; fill: object };
// Nel template la colonna O condivide UN solo oggetto-stile (fill verdino di
// default): mutare `cell.fill` muterebbe TUTTE le celle che lo condividono. Assegno
// uno stile FRESCO per cella (spread) così cambio il fill solo di quella, senza
// toccare bordi/font/numFmt (preservati nello spread).
const impostaFill = (cell: Cella, fill: object): void => {
  cell.style = { ...cell.style, fill };
};
const FILL_VUOTO = { type: 'pattern', pattern: 'none' } as const;

// terzine del template: prima riga R7, poi ogni 3 righe (R7, R10, …, R22 = max 6).
const TERZINA_RIGA0 = 7;
const RIGHE_PER_TERZINA = 3;

export interface OpzioniXlsxST36 {
  intestazione: string; // profilo (testo libero: R1 = riga 1, R2 = resto)
  numeroScheda: number;
  controlli: ControlloST36[]; // i controlli FLAGGATI (≤6)
  /** Buffer del template (per i test). In runtime, se assente, si fa fetch dell'URL. */
  templateBuffer?: ArrayBuffer;
}

const r2 = (x: number | null): number | null => (x == null ? null : Math.round(x * 100) / 100);
const r1 = (x: number | null): number | null => (x == null ? null : Math.round(x * 10) / 10);

async function caricaTemplate(): Promise<ArrayBuffer> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error(`Template ST36 non trovato (HTTP ${res.status}).`);
  return res.arrayBuffer();
}

/** Compila il template ST36 coi controlli scelti → Blob .xlsx. */
export async function generaXlsxST36(opts: OpzioniXlsxST36): Promise<Blob> {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? (mod as unknown as typeof mod.default);
  const buf = opts.templateBuffer ?? (await caricaTemplate());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Template ST36: foglio non trovato.');

  // --- Intestazione (celle già formattate nel template): scrivi solo il testo ---
  const linee = opts.intestazione.split(/\r?\n/);
  ws.getCell('A1').value = linee[0] ?? '';
  ws.getCell('A2').value = linee.slice(1).join(' ');

  // R3: opera + pk (da ControlloSalvato.opera). pk in E3 se separabile.
  const opere = [
    ...new Set(opts.controlli.map((c) => c.opera?.trim()).filter(Boolean)),
  ] as string[];
  if (opere.length === 1) {
    const m = opere[0].match(/^(.*?)[\s·-]*(pk\b.*)$/i);
    if (m) {
      ws.getCell('A3').value = m[1].trim();
      ws.getCell('E3').value = m[2].trim();
    } else {
      ws.getCell('A3').value = opere[0];
    }
  } else if (opere.length > 1) {
    ws.getCell('A3').value = opere.join('  ·  ');
  }

  // --- Righe dati: una terzina per controllo (max 6). Le eccedenze restano VUOTE. ---
  opts.controlli.slice(0, 6).forEach((c, k) => {
    const r0 = TERZINA_RIGA0 + k * RIGHE_PER_TERZINA;
    c.righe.forEach((rg, i) => {
      const r = r0 + i;
      ws.getCell(r, 1).value = rg.data; // A
      ws.getCell(r, 2).value = rg.rck; // B (intero, numFmt nel template)
      ws.getCell(r, 3).value = rg.verbale; // C
      ws.getCell(r, 4).value = rg.ubicazione; // D = parte
      ws.getCell(r, 5).value = rg.denominazione; // E (vuota)
      ws.getCell(r, 6).value = rg.laboratorio; // F
      ws.getCell(r, 7).value = rg.certificato; // G
      ws.getCell(r, 8).value = rg.dataProva; // H
      ws.getCell(r, 9).value = rg.rottGg; // I (intero)
      ws.getCell(r, 10).value = r1(rg.r1); // J — R1 a 1 decimale
      ws.getCell(r, 11).value = r1(rg.r2); // K — R2 a 1 decimale
      ws.getCell(r, 12).value = r2(rg.r); // L — R a 2 decimali
    });
    // valori del controllo sulla 1ª riga (M/N/O già merge-ate nel template)
    ws.getCell(r0, 13).value = r2(c.rmin); // M = Rmin
    ws.getCell(r0, 14).value = r2(c.rm); // N = Rm
    ws.getCell(r0, 15).value = r2(c.rckEff); // O = Rck eff
    // semaforo esito sulla Rck eff (cella master O della terzina)
    const argb = c.esito === 'conforme' ? VERDE : c.esito === 'non_conforme' ? ROSSO : null;
    if (argb) {
      impostaFill(ws.getCell(r0, 15) as unknown as Cella, {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb },
      });
    }
  });

  // Terzine NON usate (< 6 controlli): il template ha fill residui (verdino sulla
  // col O, grigio su alcune righe) → azzerali su TUTTE le celle A..O delle 3 righe
  // così la scheda mostra le terzine in eccesso vuote e NEUTRE (bianche).
  for (let k = opts.controlli.length; k < 6; k += 1) {
    const r0 = TERZINA_RIGA0 + k * RIGHE_PER_TERZINA;
    for (let i = 0; i < RIGHE_PER_TERZINA; i += 1) {
      for (let cc = 1; cc <= 15; cc += 1) {
        impostaFill(ws.getCell(r0 + i, cc) as unknown as Cella, FILL_VUOTO);
      }
    }
  }

  const out = await wb.xlsx.writeBuffer();
  return new Blob([out], { type: XLSX_MIME });
}
