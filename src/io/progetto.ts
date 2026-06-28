/**
 * File di progetto della COMMESSA — la verità su disco (M4).
 *
 * La cartella è la verità (vedi io/workspace.ts): qui dentro vive
 * `progetto.kerios.json`, snapshot serializzato dello stato di dominio cls. Si
 * riscrive interamente al salvataggio (scrittura atomica) e si rilegge al
 * collegamento per RIGENERARE la cache IndexedDB.
 *
 * SCHEMA REALE attuale (non l'esempio datato di persistenza.md): il
 * ControlloSalvato ha id PER CONTENUTO (id prelievi ordinati) e non traccia il
 * nome-file sorgente. Il file include i prelievi importati (snapshot del
 * registro) perché la cache è rigenerabile dalla verità: senza di essi, dopo
 * un'invalidazione cache il lavoro non sarebbe ricostruibile dalla cartella.
 *
 * Nome FISSO `progetto.kerios.json` (non `<commessa>.kerios.json`): così è
 * banale da ritrovare senza conoscere il nome della commessa. Predisposto per
 * l'acciaio (sezione `acciaio` futura) senza implementarlo ora.
 */
import type { ControlloSalvato, Prelievo } from '../core/index.ts';
import { caricaTuttiControlli, salvaControllo, svuotaControlli } from './controlli.ts';
import { caricaTuttiPrelieviCls, salvaPrelieviCls, svuotaPrelieviCls } from './importa.ts';
import { leggiJson, scriviJson, VERSIONE_CACHE, type HandleCartella } from './workspace.ts';

export const SCHEMA_PROGETTO = 'kerios-progetto/1';
export const FILE_PROGETTO = 'progetto.kerios.json';

export interface ProgettoKerios {
  schema: typeof SCHEMA_PROGETTO;
  /** Versione della cache con cui è stato scritto (tracciabilità). */
  versioneCache: number;
  /** Nome della commessa (= nome cartella). */
  commessa: string;
  creato: string; // ISO (passato da fuori: il dominio non legge l'orologio)
  aggiornato: string; // ISO
  cls: {
    prelievi: Prelievo[]; // snapshot del registro (cache rigenerabile dalla verità)
    controlli: ControlloSalvato[];
  };
  // acciaio: predisposto (non in M4)
}

export interface OpzioniProgetto {
  commessa: string;
  prelievi: readonly Prelievo[];
  controlli: readonly ControlloSalvato[];
  aggiornato: string; // ISO, dato dalla UI
  creato?: string; // ISO; default = aggiornato (prima scrittura)
}

/** Costruisce l'oggetto progetto (puro: niente IO, niente orologio). */
export function costruisciProgetto(opts: OpzioniProgetto): ProgettoKerios {
  return {
    schema: SCHEMA_PROGETTO,
    versioneCache: VERSIONE_CACHE,
    commessa: opts.commessa,
    creato: opts.creato ?? opts.aggiornato,
    aggiornato: opts.aggiornato,
    cls: {
      prelievi: [...opts.prelievi],
      controlli: [...opts.controlli],
    },
  };
}

/**
 * Valida/normalizza un oggetto letto dal disco. Rifiuta uno schema non
 * riconosciuto (file estraneo o di versione futura) invece di fidarsi.
 */
export function validaProgetto(raw: unknown): ProgettoKerios {
  const o = raw as Partial<ProgettoKerios> | null;
  if (o?.schema !== SCHEMA_PROGETTO) {
    throw new Error(`File di progetto non riconosciuto (schema: ${String(o?.schema)}).`);
  }
  return {
    schema: SCHEMA_PROGETTO,
    versioneCache: typeof o.versioneCache === 'number' ? o.versioneCache : VERSIONE_CACHE,
    commessa: o.commessa ?? '',
    creato: o.creato ?? '',
    aggiornato: o.aggiornato ?? '',
    cls: {
      prelievi: o.cls?.prelievi ?? [],
      controlli: o.cls?.controlli ?? [],
    },
  };
}

/** Serializza per il fallback "scarica progetto" (FSA assente). */
export function serializzaProgetto(p: ProgettoKerios): string {
  return JSON.stringify(p, null, 2);
}

// --- IO sulla cartella ------------------------------------------------------

/** Riscrive l'intero file di progetto nella cartella (atomico). */
export async function salvaProgettoSuCartella(
  dir: HandleCartella,
  opts: OpzioniProgetto,
): Promise<ProgettoKerios> {
  const p = costruisciProgetto(opts);
  await scriviJson(dir, FILE_PROGETTO, p);
  return p;
}

/** Legge il file di progetto dalla cartella; null se non c'è (commessa nuova). */
export async function caricaProgettoDaCartella(
  dir: HandleCartella,
): Promise<ProgettoKerios | null> {
  const raw = await leggiJson<unknown>(dir, FILE_PROGETTO);
  return raw == null ? null : validaProgetto(raw);
}

// --- Ponte cache (IndexedDB) <-> progetto ----------------------------------

/** Snapshot dello stato corrente della cache, per scriverlo nella cartella. */
export async function statoCacheCls(): Promise<{
  prelievi: Prelievo[];
  controlli: ControlloSalvato[];
}> {
  const [prelievi, controlli] = await Promise.all([
    caricaTuttiPrelieviCls(),
    caricaTuttiControlli(),
  ]);
  return { prelievi, controlli };
}

/**
 * RIGENERA la cache IndexedDB dal progetto (la verità). Sostituisce per intero
 * gli store-cache cls: in conflitto vince la cartella.
 */
export async function applicaProgettoACache(p: ProgettoKerios): Promise<void> {
  await svuotaPrelieviCls();
  await salvaPrelieviCls([...p.cls.prelievi]);
  await svuotaControlli();
  for (const c of p.cls.controlli) await salvaControllo(c);
}
