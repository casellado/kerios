/**
 * Import del registro ACCIAIO (AC1) da CSV/righe grezze. Strato io.
 *
 * Differenze dal cls (perché un parser dedicato):
 *  - mappatura per INTESTAZIONE (nome colonna), tollerante a maiuscole/accenti/
 *    spazi e ai typo PRESENTI nel file reale ("Allungameno", "incrudimeto");
 *  - i 3 SAGGI di ogni misura (fy/Agt/ft·fy) sono 3 COLONNE ADIACENTI sulla stessa
 *    riga → terna [v1,v2,v3];
 *  - le date adiacenti ai protocolli ("Data" dopo "Prot. Rich."/"Ricezione"/
 *    "Certificato") si risolvono per POSIZIONE rispetto alla loro àncora (gli
 *    header "Data" sono ambigui da soli);
 *  - la colonna "ISPETTORE" (dato personale, assente nell'ST36) NON viene mappata.
 *  - gli ESITI delle prove NON si importano: li calcola domain/acciaio.ts.
 * Encoding cp1252, separatore ';' (come il cls).
 */
import Papa from 'papaparse';
import { materialeDaVerbale, type PrelievoAcciaio, type Terna } from '../core/index.ts';
import { parseNumeroIt } from './formato.ts';
import { decodeCp1252 } from './csv.ts';

export interface EsitoImportAcciaio {
  prelievi: PrelievoAcciaio[];
  errori: string[];
  totaleRighe: number;
}

export interface VerificaImportAcciaio {
  accettato: boolean;
  messaggio?: string;
}

/**
 * GUARDIA all'ingresso dell'acciaio (duale della cls): ACCETTA solo verbali AC1
 * (materialeDaVerbale === 'acciaio'), RIFIUTA un file di calcestruzzo (CLS)
 * caricato per errore o privo di verbali AC1.
 */
export function verificaImportAcciaio(prelievi: readonly PrelievoAcciaio[]): VerificaImportAcciaio {
  let acciaio = 0;
  let cls = 0;
  for (const p of prelievi) {
    const m = materialeDaVerbale(p.verbale);
    if (m === 'acciaio') acciaio += 1;
    else if (m === 'cls') cls += 1;
  }
  if (cls > 0) {
    return {
      accettato: false,
      messaggio:
        'Questo file contiene verbali di CALCESTRUZZO (CLS), non di acciaio (AC1). ' +
        'Caricalo nel modulo calcestruzzo, non qui. Nessun prelievo è stato importato.',
    };
  }
  if (acciaio === 0) {
    return {
      accettato: false,
      messaggio:
        'Questo file non sembra un registro di acciaio: non contiene verbali AC1. ' +
        'Controlla di aver scelto il file giusto. Nessun prelievo è stato importato.',
    };
  }
  return { accettato: true };
}

/** Normalizza un'intestazione per il match: minuscole, senza accenti né simboli. */
function norm(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Indici di colonna ricavati DALL'INTESTAZIONE (per nome, non per posizione). */
interface ColIdx {
  verbale: number;
  wbs: number;
  data: number;
  ddt: number;
  opera: number;
  ubicazione: number;
  denominazione: number;
  parte: number;
  produttore: number;
  diametro: number;
  colata: number;
  protRich: number;
  dataRich: number;
  protRicez: number;
  dataRicez: number;
  laboratorio: number;
  dataProva: number;
  certificato: number;
  dataCert: number;
  fy: number;
  agt: number;
  ftfy: number;
  piega: number;
  note: number;
}

function trova(
  headers: string[],
  grezzi: string[],
  pred: (n: string, raw: string) => boolean,
): number {
  for (let i = 0; i < headers.length; i += 1) {
    if (pred(headers[i] ?? '', grezzi[i] ?? '')) return i;
  }
  return -1;
}

/** Una colonna "Data" subito DOPO l'àncora (header che contiene 'data'), altrimenti -1. */
function dataDopo(headers: string[], ancora: number): number {
  if (ancora < 0) return -1;
  const succ = headers[ancora + 1];
  return succ != null && succ.includes('data') ? ancora + 1 : -1;
}

function costruisciIdx(grezzi: string[]): ColIdx {
  const h = grezzi.map(norm);
  const protRich = trova(h, grezzi, (n) => n.includes('rich')); // Prot. Rich. D.L.
  const protRicez = trova(h, grezzi, (n) => n.includes('ricez')); // Protocollo Ricezione
  const certificato = trova(h, grezzi, (n) => n.includes('certificat'));
  return {
    verbale: trova(h, grezzi, (n) => n.includes('verbale')),
    wbs: trova(h, grezzi, (n) => n.includes('wbs')),
    data: trova(h, grezzi, (n) => n.includes('data') && n.includes('prelievo')),
    ddt: trova(h, grezzi, (n) => n.includes('ddt')),
    // "PARTE D'OPERA" contiene sia parte sia opera → l'opera "pura" esclude parte
    opera: trova(h, grezzi, (n) => n.includes('opera') && !n.includes('parte')),
    ubicazione: trova(h, grezzi, (n) => n.includes('ubicazion')),
    denominazione: trova(h, grezzi, (n) => n.includes('denominazion')),
    parte: trova(h, grezzi, (n) => n.includes('parte')),
    produttore: trova(h, grezzi, (n) => n.includes('produttore') || n.includes('marchio')),
    diametro: trova(h, grezzi, (n, raw) => raw.includes('Ø') || n.includes('diametr')),
    colata: trova(h, grezzi, (n) => n.includes('colata')),
    protRich,
    dataRich: dataDopo(h, protRich),
    protRicez,
    dataRicez: dataDopo(h, protRicez),
    laboratorio: trova(h, grezzi, (n) => n.includes('laborator')),
    dataProva: trova(h, grezzi, (n) => n.includes('data') && n.includes('prova')),
    certificato,
    dataCert: dataDopo(h, certificato),
    fy: trova(h, grezzi, (n) => n.includes('snerv') || n === 'fy'),
    agt: trova(h, grezzi, (n) => n.includes('agt') || n.includes('allung')),
    ftfy: trova(h, grezzi, (n) => n.includes('incrud') || (n.includes('ft') && n.includes('fy'))),
    piega: trova(h, grezzi, (n) => n.includes('piega')),
    note: trova(h, grezzi, (n) => n.includes('note')),
  };
}

function cella(cells: string[], i: number): string | undefined {
  if (i < 0) return undefined;
  const v = cells[i]?.trim();
  return v ? v : undefined;
}

function assegna<T extends object, K extends string, V>(o: T, k: K, v: V | undefined): void {
  if (v !== undefined) (o as Record<string, unknown>)[k] = v;
}

/** Terna a partire dalla colonna àncora: àncora, àncora+1, àncora+2 (NaN se assente). */
function terna(cells: string[], inizio: number): Terna {
  const at = (off: number): number =>
    inizio < 0 ? Number.NaN : (parseNumeroIt(cells[inizio + off]) ?? Number.NaN);
  return [at(0), at(1), at(2)];
}

function isHeaderRow(grezzi: string[]): boolean {
  return grezzi.some((c) => norm(c).includes('verbale'));
}

/** Mappa UNA riga dati → PrelievoAcciaio, o null se inutilizzabile. */
function mapRiga(
  cells: string[],
  idx: ColIdx,
): { prelievo: PrelievoAcciaio | null; errore?: string } {
  const verbale = cella(cells, idx.verbale);
  if (!verbale) return { prelievo: null, errore: 'riga senza VERBALE → scartata' };
  const wbs = cella(cells, idx.wbs) ?? '';

  const p: PrelievoAcciaio = {
    id: `${wbs}|${verbale}`,
    wbs,
    verbale,
    data: cella(cells, idx.data) ?? '',
    produttore: cella(cells, idx.produttore) ?? '',
    diametro: idx.diametro < 0 ? Number.NaN : (parseNumeroIt(cells[idx.diametro]) ?? Number.NaN),
    fy: terna(cells, idx.fy),
    agt: terna(cells, idx.agt),
    ftfy: terna(cells, idx.ftfy),
    piega: cella(cells, idx.piega) ?? '',
  };
  assegna(p, 'ddt', cella(cells, idx.ddt));
  assegna(p, 'opera', cella(cells, idx.opera));
  assegna(p, 'ubicazione', cella(cells, idx.ubicazione));
  assegna(p, 'denominazione', cella(cells, idx.denominazione));
  assegna(p, 'parte', cella(cells, idx.parte));
  assegna(p, 'colata', cella(cells, idx.colata));
  assegna(p, 'protRichiestaDL', cella(cells, idx.protRich));
  assegna(p, 'dataRichiestaDL', cella(cells, idx.dataRich));
  assegna(p, 'protRicezione', cella(cells, idx.protRicez));
  assegna(p, 'dataRicezione', cella(cells, idx.dataRicez));
  assegna(p, 'laboratorio', cella(cells, idx.laboratorio));
  assegna(p, 'dataProva', cella(cells, idx.dataProva));
  assegna(p, 'certificato', cella(cells, idx.certificato));
  assegna(p, 'dataCertificato', cella(cells, idx.dataCert));
  assegna(p, 'note', cella(cells, idx.note));
  return { prelievo: p };
}

/**
 * Righe grezze (array di celle) → prelievi + errori. Condivisa CSV/XLSX. Trova la
 * riga d'intestazione (quella che contiene "Verbale"), costruisce gli indici per
 * NOME e mappa le righe successive.
 */
export function righeAcciaioToEsito(righe: unknown[][]): EsitoImportAcciaio {
  const prelievi: PrelievoAcciaio[] = [];
  const errori: string[] = [];
  let totaleRighe = 0;

  const norma = (riga: unknown[]): string[] => riga.map((c) => (c == null ? '' : String(c)));
  const intestIdx = righe.findIndex((r) => Array.isArray(r) && isHeaderRow(norma(r)));
  if (intestIdx < 0) {
    return {
      prelievi: [],
      errori: ['Intestazione non riconosciuta (manca la colonna «Verbale»).'],
      totaleRighe: 0,
    };
  }
  const idx = costruisciIdx(norma(righe[intestIdx] as unknown[]));

  for (let i = intestIdx + 1; i < righe.length; i += 1) {
    const riga = righe[i];
    if (!Array.isArray(riga)) continue;
    const cells = norma(riga);
    if (cells.every((c) => c.trim() === '')) continue;
    totaleRighe += 1;
    const { prelievo, errore } = mapRiga(cells, idx);
    if (prelievo) prelievi.push(prelievo);
    if (errore) errori.push(`Riga ${totaleRighe}: ${errore}`);
  }
  return { prelievi, errori, totaleRighe };
}

/** Qualifica un foglio come "registro prelievi AC1" (per scegliere il foglio giusto in xlsx multi-foglio). */
export interface ValutazioneFoglio {
  /** true se l'header ha «Verbale» + almeno 2 colonne fra WBS/Produttore/Ø/fy. */
  idoneo: boolean;
  /** righe dati non vuote dopo l'header (per preferire il foglio più ricco). */
  righeDati: number;
}

/**
 * Valuta se un foglio (righe grezze) è il registro dei prelievi: richiede l'header
 * con «Verbale» E almeno 2 colonne caratteristiche (WBS/Produttore/Ø/fy). Così un
 * foglio accessorio con solo «Verbale n. | NOTE» (es. "correzioni da fare") o una
 * "Copertina" vuota NON qualificano.
 */
export function valutaFoglioAcciaio(righe: unknown[][]): ValutazioneFoglio {
  const norma = (riga: unknown[]): string[] => riga.map((c) => (c == null ? '' : String(c)));
  const idx = righe.findIndex((r) => Array.isArray(r) && isHeaderRow(norma(r)));
  if (idx < 0) return { idoneo: false, righeDati: 0 };
  const grezzi = norma(righe[idx] as unknown[]);
  const h = grezzi.map(norm);
  const ha = (pred: (n: string, raw: string) => boolean): boolean =>
    grezzi.some((raw, i) => pred(h[i] ?? '', raw));
  let extra = 0;
  if (ha((n) => n.includes('wbs'))) extra += 1;
  if (ha((n) => n.includes('produttore') || n.includes('marchio'))) extra += 1;
  if (ha((n, raw) => raw.includes('Ø') || n.includes('diametr'))) extra += 1;
  if (ha((n) => n.includes('snerv') || n === 'fy')) extra += 1;
  let righeDati = 0;
  for (let i = idx + 1; i < righe.length; i += 1) {
    const r = righe[i];
    if (Array.isArray(r) && norma(r).some((c) => c.trim() !== '')) righeDati += 1;
  }
  return { idoneo: extra >= 2, righeDati };
}

/** Parsing completo del CSV acciaio (byte cp1252, ';') → prelievi + errori. */
export function parseRegistroAcciaioCsv(bytes: Uint8Array): EsitoImportAcciaio {
  const testo = decodeCp1252(bytes);
  const out = Papa.parse<string[]>(testo, { delimiter: ';', skipEmptyLines: 'greedy' });
  const esito = righeAcciaioToEsito(out.data);
  for (const e of out.errors) esito.errori.push(`Parser: ${e.message} (riga ${e.row ?? '?'})`);
  return esito;
}
