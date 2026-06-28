/**
 * Persistenza delle SCHEDE di export (IndexedDB). Le schede raggruppano i
 * controlli completi (≤6) prima dell'export ST36. Cartella = verità (serializzate
 * anche nel progetto.kerios.json); IndexedDB = cache.
 */
import type { SchedaExport } from '../core/index.ts';
import { db } from './db.ts';

export function caricaSchede(): Promise<SchedaExport[]> {
  return db.schedeExport.toArray();
}

/** Sostituisce l'intero insieme di schede (clear + bulkPut): single source. */
export async function salvaSchede(schede: readonly SchedaExport[]): Promise<void> {
  await db.transaction('rw', db.schedeExport, async () => {
    await db.schedeExport.clear();
    if (schede.length > 0) await db.schedeExport.bulkPut([...schede]);
  });
}

export function svuotaSchede(): Promise<void> {
  return db.schedeExport.clear();
}
