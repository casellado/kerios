/**
 * Documenti collegati (PDF) — M5. Associazione per NOME-FILE nella cartella nota.
 *
 * PRINCIPIO (PO+CTO): la CARTELLA è la verità. Il documento di un prelievo è "il
 * file <nome> nella cartella <materiale>/<WBS>/{pdf|allegati}". L'associazione
 * (il NOME) vive nel file di progetto (serializzato sui campi del Prelievo); il
 * FILE vive nella cartella. NIENTE handle tecnici persistiti: così il
 * collegamento sopravvive a spostamenti, cambio PC, sync OneDrive, invalidazione
 * cache — Kerios lo ritrova navigando la cartella.
 *
 * Collegare = COPIARE i byte nella cartella nota + salvare il nome. Aprire =
 * ritrovare il file per nome → getFile → (in UI) objectURL → nuova scheda.
 */
import {
  apriFile,
  cartellaPercorso,
  copiaFileIn,
  elencaNomi,
  type HandleCartella,
} from './workspace.ts';

/** Tipi di documento cls (uno per dato-link in tabella). */
export type TipoDocCls =
  'certificato' | 'verbale' | 'ddt' | 'mix' | 'protRichiesta' | 'protRicezione';

/** Sottocartella di destinazione per tipo (pdf/ = PDF "ufficiali"; allegati/ = il resto). */
const SOTTO: Record<TipoDocCls, 'pdf' | 'allegati'> = {
  certificato: 'pdf',
  verbale: 'pdf',
  ddt: 'allegati',
  mix: 'allegati',
  protRichiesta: 'allegati',
  protRicezione: 'allegati',
};

const MATERIALE_CLS = 'calcestruzzo';

/** Segmenti di percorso per la sottocartella di un tipo dentro una WBS. */
function percorso(wbs: string, tipo: TipoDocCls): string[] {
  return [MATERIALE_CLS, wbs, SOTTO[tipo]];
}

/**
 * Collega un documento: copia il file nella cartella nota della WBS e ritorna il
 * NOME-FILE da salvare nel prelievo. Crea le sottocartelle se mancano.
 */
export async function collegaDocCls(
  commessa: HandleCartella,
  wbs: string,
  tipo: TipoDocCls,
  file: File,
): Promise<string> {
  const dir = await cartellaPercorso(commessa, percorso(wbs, tipo), { create: true });
  if (!dir) throw new Error('Cartella di destinazione non disponibile.');
  return copiaFileIn(dir, file);
}

/** Apre (legge) il documento collegato; null se non è (più) nella cartella. */
export async function apriDocCls(
  commessa: HandleCartella,
  wbs: string,
  tipo: TipoDocCls,
  nome: string,
): Promise<File | null> {
  const dir = await cartellaPercorso(commessa, percorso(wbs, tipo));
  return dir ? apriFile(dir, nome) : null;
}

/** Insiemi dei file PRESENTI in pdf/ e allegati/ di una WBS (mappa di presenza). */
export interface PresenzaWbs {
  pdf: Set<string>;
  allegati: Set<string>;
}

/**
 * Costruisce la presenza per UNA WBS con UN solo elenco per sottocartella (non N
 * query per cella): le celle leggono dagli insiemi → indicatore 📎/⚠ a scala.
 */
export async function presenzaDocCls(commessa: HandleCartella, wbs: string): Promise<PresenzaWbs> {
  const pdfDir = await cartellaPercorso(commessa, [MATERIALE_CLS, wbs, 'pdf']);
  const allDir = await cartellaPercorso(commessa, [MATERIALE_CLS, wbs, 'allegati']);
  return {
    pdf: new Set(pdfDir ? await elencaNomi(pdfDir) : []),
    allegati: new Set(allDir ? await elencaNomi(allDir) : []),
  };
}

/** Sottocartella ('pdf'|'allegati') in cui vive un tipo — per leggere la presenza. */
export function sottocartellaDi(tipo: TipoDocCls): 'pdf' | 'allegati' {
  return SOTTO[tipo];
}
