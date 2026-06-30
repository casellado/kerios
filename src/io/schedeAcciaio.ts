/**
 * Persistenza delle SCHEDE di export ST36 ACCIAIO (IndexedDB). Gemella di
 * io/schede.ts (cls), store separato `schedeAcciaio`. Single source: clear + bulkPut.
 */
import type { SchedaExportAcciaio } from '../core/index.ts';
import { db } from './db.ts';

export function caricaSchedeAcciaio(): Promise<SchedaExportAcciaio[]> {
  return db.schedeAcciaio.toArray();
}

export async function salvaSchedeAcciaio(schede: readonly SchedaExportAcciaio[]): Promise<void> {
  await db.transaction('rw', db.schedeAcciaio, async () => {
    await db.schedeAcciaio.clear();
    if (schede.length > 0) await db.schedeAcciaio.bulkPut([...schede]);
  });
}

export function svuotaSchedeAcciaio(): Promise<void> {
  return db.schedeAcciaio.clear();
}
