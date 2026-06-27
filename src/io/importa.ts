/**
 * Import/lettura dei prelievi cls su IndexedDB.
 *
 * Scritture in BATCH: `bulkPut` a chunk dentro UNA transazione. Il collo di
 * bottiglia di IndexedDB sono le transazioni, non i dati: un record per
 * transazione sarebbe minuti vs secondi sui ~35k storici. Qui i record sono
 * pochi, ma la FORMA è quella che regge la scala (e potrà girare in Web Worker).
 *
 * Idempotente: la chiave primaria è `id` (derivata da wbs+verbale), quindi
 * re-importare lo stesso file AGGIORNA i record, non li duplica.
 */
import type { Prelievo } from '../core/index.ts';
import { db } from './db.ts';

/** Salva i prelievi in IndexedDB a chunk. Ritorna quanti ne ha scritti. */
export async function salvaPrelieviCls(prelievi: Prelievo[], chunk = 500): Promise<number> {
  if (prelievi.length === 0) return 0;
  await db.transaction('rw', db.prelieviCls, async () => {
    for (let i = 0; i < prelievi.length; i += chunk) {
      await db.prelieviCls.bulkPut(prelievi.slice(i, i + chunk));
    }
  });
  return prelievi.length;
}

/** Tutti i prelievi cls (vista non partizionata; per il Quadro si useranno le sintesi). */
export function caricaTuttiPrelieviCls(): Promise<Prelievo[]> {
  return db.prelieviCls.toArray();
}

/** Prelievi della sola WBS (partizione di lavoro). */
export function caricaPrelieviClsWbs(wbs: string): Promise<Prelievo[]> {
  return db.prelieviCls.where('wbs').equals(wbs).toArray();
}

export function contaPrelieviCls(): Promise<number> {
  return db.prelieviCls.count();
}

/** Svuota lo store (utile per un re-import pulito o nei test). */
export function svuotaPrelieviCls(): Promise<void> {
  return db.prelieviCls.clear();
}
