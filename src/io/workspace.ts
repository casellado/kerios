/**
 * Cartella di lavoro — File System Access API (M4).
 *
 * PRINCIPIO CARDINE (PO+CTO): la CARTELLA sul disco è la VERITÀ. Kerios si
 * collega, EREDITA il contenuto, ci lavora e al salvataggio RISCRIVE nella
 * cartella. IndexedDB è solo CACHE/motore veloce, MAI una verità parallela. In
 * conflitto vince sempre la cartella (vedi docs/struttura-cartelle.md,
 * docs/filosofia-kerios.md). Il file di progetto vive in io/progetto.ts.
 *
 * Best practice correnti (WICG File System Access, Chrome for Developers, MDN,
 * giu. 2026):
 *  - gli handle sono structured-cloneable → si PERSISTONO in IndexedDB e si
 *    ritrovano al riavvio (niente picker ogni volta);
 *  - un handle ripreso da IndexedDB torna a permesso 'prompt': PRIMA di
 *    leggere/scrivere si ri-chiede il permesso con requestPermission SU GESTO
 *    UTENTE (insidia nota: la prima scrittura lancia NotAllowedError altrimenti).
 *    Da Chrome 122 esistono i "persistent permissions" che riducono i re-prompt,
 *    ma il pattern query→request resta il baseline robusto e portabile;
 *  - scrittura ATOMICA: createWritable() → write() → close(); il file atterra su
 *    disco solo al close() → niente file mezzo-scritto su OneDrive (cloud-backed
 *    pickers inclusi: lo spec ammette provider cloud).
 *
 * Le funzioni di logica (struttura, json) lavorano su handle-LIKE iniettati →
 * testabili in node senza DOM. Il picker e la rilevazione del supporto sono i
 * soli punti legati al browser.
 */
import { db } from './db.ts';

// --- Tipi minimi degli handle (non si dipende da lib.dom, che non espone
//     ancora query/requestPermission né showDirectoryPicker in modo stabile) ---
export type StatoPermesso = 'granted' | 'denied' | 'prompt';
export interface OpzioniPermesso {
  mode?: 'read' | 'readwrite';
}

export interface HandleFile {
  readonly name: string;
  readonly kind: 'file';
  getFile(): Promise<File>;
  createWritable(opts?: { keepExistingData?: boolean }): Promise<WritableLike>;
  queryPermission?(opts?: OpzioniPermesso): Promise<StatoPermesso>;
  requestPermission?(opts?: OpzioniPermesso): Promise<StatoPermesso>;
}

export interface HandleCartella {
  readonly name: string;
  readonly kind: 'directory';
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<HandleCartella>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<HandleFile>;
  removeEntry?(name: string, opts?: { recursive?: boolean }): Promise<void>;
  keys?(): AsyncIterableIterator<string>;
  queryPermission?(opts?: OpzioniPermesso): Promise<StatoPermesso>;
  requestPermission?(opts?: OpzioniPermesso): Promise<StatoPermesso>;
}

interface WritableLike {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

interface ConPicker {
  showDirectoryPicker(opts?: { mode?: 'read' | 'readwrite'; id?: string }): Promise<HandleCartella>;
}

/** Materiali noti sotto la commessa (struttura-cartelle.md). */
export const MATERIALI = ['calcestruzzo', 'acciaio'] as const;
/** Sottocartelle note dentro ogni WBS (predisposte; create on-demand alla WBS). */
export const SOTTOCARTELLE_WBS = ['verbali', 'pdf', 'allegati'] as const;
/** Profilo intestazione commessa (profilo-commessa.md). */
export const FILE_PROFILO = 'profilo-commessa.json';

/** Supporto File System Access (Chrome/Edge desktop; Firefox/Safari/mobile no). */
export const FSA_SUPPORTATO =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as unknown as Partial<ConPicker>).showDirectoryPicker === 'function';

function isNotFound(e: unknown): boolean {
  return (e as { name?: string } | null)?.name === 'NotFoundError';
}

// --- Picker (gesto utente) -------------------------------------------------

/**
 * Mostra il picker e ritorna l'handle della cartella COMMESSA, o null se
 * l'utente annulla (AbortError non è un errore). DEVE partire da un click.
 */
export async function scegliCartellaCommessa(): Promise<HandleCartella | null> {
  if (!FSA_SUPPORTATO) return null;
  try {
    return await (globalThis as unknown as ConPicker).showDirectoryPicker({
      mode: 'readwrite',
      id: 'kerios-commessa',
    });
  } catch (e) {
    if ((e as { name?: string } | null)?.name === 'AbortError') return null;
    throw e;
  }
}

// --- Permessi (ri-verifica su gesto utente al riavvio) ---------------------

/**
 * Garantisce il permesso sull'handle. queryPermission → (se non 'granted')
 * requestPermission, che DEVE essere chiamato in risposta a un gesto utente.
 * Se l'handle non espone l'API permessi (es. ambiente di test) si assume ok.
 */
export async function assicuraPermesso(
  handle: HandleCartella | HandleFile,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if ((await handle.queryPermission({ mode })) === 'granted') return true;
  return (await handle.requestPermission({ mode })) === 'granted';
}

// --- Struttura cartelle (verifica / creazione su conferma) -----------------

export interface EsitoStruttura {
  completa: boolean;
  /** Voci attese e assenti (es. 'calcestruzzo/', 'profilo-commessa.json'). */
  mancano: string[];
}

async function haDir(dir: HandleCartella, nome: string): Promise<boolean> {
  try {
    await dir.getDirectoryHandle(nome);
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

async function haFile(dir: HandleCartella, nome: string): Promise<boolean> {
  try {
    await dir.getFileHandle(nome);
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

/**
 * Verifica che la cartella collegata abbia la struttura Kerios attesa: le
 * cartelle materiale (calcestruzzo/, acciaio/) e il profilo commessa. NON
 * pretende le sottocartelle <WBS> (nascono col primo WBS).
 */
export async function verificaStruttura(dir: HandleCartella): Promise<EsitoStruttura> {
  const mancano: string[] = [];
  for (const m of MATERIALI) if (!(await haDir(dir, m))) mancano.push(`${m}/`);
  if (!(await haFile(dir, FILE_PROFILO))) mancano.push(FILE_PROFILO);
  return { completa: mancano.length === 0, mancano };
}

/**
 * Crea la struttura attesa (azione su CONFERMA esplicita dell'utente, mai
 * silenziosa): cartelle materiale + profilo minimo se assente. Idempotente.
 */
export async function creaStruttura(dir: HandleCartella): Promise<void> {
  for (const m of MATERIALI) await dir.getDirectoryHandle(m, { create: true });
  if (!(await haFile(dir, FILE_PROFILO))) {
    await scriviJson(dir, FILE_PROFILO, {
      schema: 'kerios-profilo-commessa/1',
      commessa: dir.name,
    });
  }
}

// --- JSON su cartella (scrittura atomica) ----------------------------------

/** Scrive `dati` come JSON in `nome` dentro `dir` in modo ATOMICO (close()). */
export async function scriviJson(dir: HandleCartella, nome: string, dati: unknown): Promise<void> {
  const fh = await dir.getFileHandle(nome, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(dati, null, 2));
  await w.close(); // solo ora il file atterra su disco
}

/** Legge e parsa il JSON `nome` in `dir`; null se il file non esiste. */
export async function leggiJson<T>(dir: HandleCartella, nome: string): Promise<T | null> {
  try {
    const fh = await dir.getFileHandle(nome);
    const file = await fh.getFile();
    return JSON.parse(await file.text()) as T;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

// --- Navigazione sottocartelle + file generici (M5) ------------------------

/**
 * Naviga `base → segmenti[0] → segmenti[1] → …` e ritorna la sottocartella.
 * Con `create:true` le crea se mancano; senza, ritorna null se una manca (la
 * struttura non c'è ancora). Es. segmenti = ['calcestruzzo', 'ST11', 'pdf'].
 */
export async function cartellaPercorso(
  base: HandleCartella,
  segmenti: readonly string[],
  opts?: { create?: boolean },
): Promise<HandleCartella | null> {
  let dir = base;
  for (const s of segmenti) {
    try {
      dir = await dir.getDirectoryHandle(s, { create: opts?.create ?? false });
    } catch (e) {
      if (isNotFound(e)) return null;
      throw e;
    }
  }
  return dir;
}

/** Copia i BYTE di `file` in `dir` col nome dato (default = file.name). Atomico. */
export async function copiaFileIn(
  dir: HandleCartella,
  file: File,
  nome: string = file.name,
): Promise<string> {
  const fh = await dir.getFileHandle(nome, { create: true });
  const w = await fh.createWritable();
  await w.write(file);
  await w.close();
  return nome;
}

/** Apre il file `nome` in `dir` (per leggerlo/aprirlo); null se non c'è. */
export async function apriFile(dir: HandleCartella, nome: string): Promise<File | null> {
  try {
    const fh = await dir.getFileHandle(nome);
    return await fh.getFile();
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

/** Elenca i NOMI delle voci in `dir` (per costruire la mappa di presenza). */
export async function elencaNomi(dir: HandleCartella): Promise<string[]> {
  if (!dir.keys) return [];
  const nomi: string[] = [];
  for await (const k of dir.keys()) nomi.push(k);
  return nomi;
}

// --- Persistenza dell'handle e versione cache (appKv) ----------------------

const K_HANDLE = 'cartellaCommessa';
const K_VERSIONE = 'versioneCache';

/**
 * VERSIONE della cache. Bump quando cambia la FORMA dei dati cacheati: all'avvio
 * una cache di versione diversa viene INVALIDATA (vedi allineaVersioneCache).
 * v1 = prima M4: invalida la cache pre-fix (controlli stantii di collaudo).
 */
export const VERSIONE_CACHE = 1;

export async function salvaHandleCommessa(dir: HandleCartella): Promise<void> {
  await db.appKv.put({ chiave: K_HANDLE, valore: dir });
}

export async function recuperaHandleCommessa(): Promise<HandleCartella | null> {
  const r = await db.appKv.get(K_HANDLE);
  return (r?.valore as HandleCartella | undefined) ?? null;
}

export async function dimenticaHandleCommessa(): Promise<void> {
  await db.appKv.delete(K_HANDLE);
}

/**
 * AUTO per versione (invisibile): se la cache è di una versione diversa da quella
 * corrente, la INVALIDA (svuota gli store-CACHE prelievi+controlli) e aggiorna il
 * marcatore. Ritorna true se ha invalidato. Sicuro PROPRIO perché la verità è la
 * cartella: alla riconnessione la cache si rigenera dal file di progetto. NON
 * tocca l'handle né il file sul disco. Va chiamata all'avvio, prima del load.
 *
 * Nota (documentata per il CTO): invalidando la cache si perdono anche i prelievi
 * importati (re-importabili da CSV/cartella) e gli eventuali controlli mai
 * salvati su cartella — esattamente la "spazzatura di collaudo" pre-fix. I dati
 * salvati nella cartella-verità non si perdono: si rileggono al collegamento.
 */
export async function allineaVersioneCache(): Promise<boolean> {
  const r = await db.appKv.get(K_VERSIONE);
  if (r?.valore === VERSIONE_CACHE) return false;
  await db.prelieviCls.clear();
  await db.controlliCls.clear();
  await db.appKv.put({ chiave: K_VERSIONE, valore: VERSIONE_CACHE });
  return true;
}
