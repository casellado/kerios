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
import type { Prelievo, ControlloSalvato } from '../core/index.ts';

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
  prelieviCls!: Table<Prelievo, string>;
  sintesiWbs!: Table<SintesiWbs, string>;
  controlliCls!: Table<ControlloSalvato, string>;

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
  }
}

/**
 * Istanza unica. NON viene aperta qui: Dexie apre pigramente alla prima query.
 */
export const db = new KeriosDB();
