/**
 * Import/lettura dei prelievi ACCIAIO su IndexedDB. Gemello di io/importa.ts (cls),
 * store PARALLELO `prelieviAcciaio` — nessuna funzione cls viene parametrizzata.
 *
 * Idempotente: chiave primaria `id` (= wbs|verbale) → re-import aggiorna, non duplica.
 * Scritture in BATCH (bulkPut a chunk in transazione), forma che regge la scala.
 */
import type { PrelievoAcciaio } from '../core/index.ts';
import { db } from './db.ts';

export async function salvaPrelieviAcciaio(
  prelievi: PrelievoAcciaio[],
  chunk = 500,
): Promise<number> {
  if (prelievi.length === 0) return 0;
  await db.transaction('rw', db.prelieviAcciaio, async () => {
    for (let i = 0; i < prelievi.length; i += chunk) {
      await db.prelieviAcciaio.bulkPut(prelievi.slice(i, i + chunk));
    }
  });
  return prelievi.length;
}

export function caricaTuttiPrelieviAcciaio(): Promise<PrelievoAcciaio[]> {
  return db.prelieviAcciaio.toArray();
}

export function caricaPrelieviAcciaioWbs(wbs: string): Promise<PrelievoAcciaio[]> {
  return db.prelieviAcciaio.where('wbs').equals(wbs).toArray();
}

export function contaPrelieviAcciaio(): Promise<number> {
  return db.prelieviAcciaio.count();
}

export function svuotaPrelieviAcciaio(): Promise<void> {
  return db.prelieviAcciaio.clear();
}
