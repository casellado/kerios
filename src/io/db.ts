/**
 * Strato di persistenza locale — IndexedDB via Dexie.
 *
 * Fonte: docs/scala-e-persistenza.md. Volumi reali ~65.000+ record: Kerios
 * desktop NON carica un CSV in memoria, usa IndexedDB come archivio di lavoro
 * (OneDrive resta verità/backup). QUI in M0 si PREDISPONE solo lo schema: niente
 * dati caricati, nessuna `db.open()` allo startup.
 *
 * Decisioni di scala già cablate nella forma (attive da M2):
 *  - PARTIZIONE PER WBS: ogni record ha `wbs` indicizzato; si lavora una WBS alla
 *    volta caricando solo quella (sharding per object store, non per database —
 *    un solo DB, indici per WBS).
 *  - INDICI sui campi di filtro (wbs, rck, mix, stato, data) per ricerche istantanee.
 *  - IMPORT BATCH: lo storico (~35k) si importerà con `bulkPut` dentro transazioni,
 *    a chunk, in un Web Worker (best practice Dexie verificata). NON un record per
 *    transazione. Vedi M2.
 *
 * I tipi di riga sono MINIMI in M0 (solo id + campi indicizzati): i modelli di
 * dominio completi (Prelievo, SaggioAcciaio) arrivano in M1/M2 e raffineranno
 * queste righe senza cambiare la forma degli store.
 */
import Dexie, { type Table } from 'dexie';

/** Riga prelievo cls — campi minimi indicizzati (estesa in M2 col modello dominio). */
export interface RigaPrelievoCls {
  id: string;
  wbs: string;
  rck?: number;
  mix?: string;
  /** stato derivato del ciclo di vita: 'verbale' | 'trasmesso' | 'refertato'. */
  stato?: string;
  data?: string;
}

/** Riga saggio/verbale acciaio — campi minimi indicizzati (estesa in M7). */
export interface RigaPrelievoAcciaio {
  id: string;
  wbs: string;
  verbale?: string;
  produttore?: string;
  data?: string;
}

/**
 * Indice di sintesi per WBS — alimenta il Quadro generale SENZA caricare i
 * 65.000 record (conteggi/esiti aggregati). Popolato in M8.
 */
export interface SintesiWbs {
  wbs: string;
  nPrelieviCls?: number;
  nPrelieviAcciaio?: number;
  aggiornato?: string;
}

export class KeriosDB extends Dexie {
  prelieviCls!: Table<RigaPrelievoCls, string>;
  prelieviAcciaio!: Table<RigaPrelievoAcciaio, string>;
  sintesiWbs!: Table<SintesiWbs, string>;

  constructor() {
    super('kerios');
    // Schema v1: chiave primaria `id`/`wbs` + indici sui campi di filtro.
    // Il '&' su wbs in sintesiWbs = chiave unica per WBS.
    this.version(1).stores({
      prelieviCls: 'id, wbs, rck, mix, stato, data',
      prelieviAcciaio: 'id, wbs, verbale, produttore, data',
      sintesiWbs: '&wbs',
    });
  }
}

/**
 * Istanza unica. NON viene aperta qui: Dexie apre pigramente alla prima query.
 * In M0 nessuno la interroga (nessun dato in memoria allo startup).
 */
export const db = new KeriosDB();
