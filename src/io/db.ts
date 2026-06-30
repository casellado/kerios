/**
 * Strato di persistenza locale — IndexedDB via Dexie.
 *
 * Fonte: docs/scala-e-persistenza.md. Volumi reali ~65.000+ record: Kerios
 * desktop NON carica un CSV in memoria, usa IndexedDB come archivio di lavoro
 * (OneDrive resta verità/backup, da M4).
 *
 * Decisioni di scala cablate nella forma:
 *  - PARTIZIONE PER WBS: `wbs` indicizzato; si lavora una WBS alla volta.
 *  - INDICI sui campi di filtro (wbs, rck, mix, data) per ricerche istantanee.
 *  - IMPORT BATCH: `bulkPut` a chunk dentro transazione (vedi io/importa.ts).
 *
 * Si archivia il `Prelievo` COMPLETO (Dexie serializza l'oggetto intero); gli
 * indici sono solo per le query. Lo `stato` del ciclo di vita è DERIVATO, quindi
 * NON è una colonna indicizzata: si calcola con statoPrelievo() (record pochi per
 * WBS). I tipi di dominio vivono in core/ (non si duplicano qui).
 */
import Dexie, { type Table } from 'dexie';
import type {
  Prelievo,
  ControlloSalvato,
  SchedaExport,
  PrelievoAcciaio,
  SchedaExportAcciaio,
} from '../core/index.ts';

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

/**
 * Coppia chiave→valore di servizio per l'app (M4): l'handle della cartella di
 * lavoro (FileSystemDirectoryHandle, serializzabile via structured clone) e la
 * versione della cache. NON sono dati di dominio: è solo stato dell'app per
 * ritrovare la cartella-verità al riavvio e per invalidare la cache stantia.
 */
export interface AppKv {
  chiave: string;
  valore: unknown;
}

export class KeriosDB extends Dexie {
  prelieviCls!: Table<Prelievo, string>;
  sintesiWbs!: Table<SintesiWbs, string>;
  controlliCls!: Table<ControlloSalvato, string>;
  appKv!: Table<AppKv, string>;
  schedeExport!: Table<SchedaExport, string>;
  prelieviAcciaio!: Table<PrelievoAcciaio, string>;
  schedeAcciaio!: Table<SchedaExportAcciaio, string>;

  constructor() {
    super('kerios');
    this.version(1).stores({
      prelieviCls: 'id, wbs, rck, mix, data',
      sintesiWbs: '&wbs',
    });
    // v2: i controlli salvati (referenziano i prelievi per id). Le tabelle v1
    // restano valide; Dexie migra senza perdere i prelievi già importati.
    this.version(2).stores({
      controlliCls: 'id, wbs, tipo, rck',
    });
    // v3 (M4): stato di servizio dell'app (handle cartella, versione cache). Le
    // tabelle dati restano invariate; Dexie le mantiene attraverso le versioni.
    this.version(3).stores({
      appKv: '&chiave',
    });
    // v4: schede di export ST36 (raggruppano i controlli completi, ≤6).
    this.version(4).stores({
      schedeExport: 'id, esportato',
    });
    // v5: modulo ACCIAIO — store PARALLELO ai cls (decisione CTO: niente IO
    // generico, zero rischio sul cls collaudato). Le tabelle cls restano invariate.
    this.version(5).stores({
      prelieviAcciaio: 'id, wbs, diametro, produttore, data',
    });
    // v6 (Fase 2 acciaio): schede di export ST36 acciaio (≤18 prelievi).
    this.version(6).stores({
      schedeAcciaio: 'id, esportato',
    });
  }
}

/**
 * Istanza unica. NON viene aperta qui: Dexie apre pigramente alla prima query.
 */
export const db = new KeriosDB();
