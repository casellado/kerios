/**
 * Persistenza dei controlli di accettazione su IndexedDB. Un controllo
 * referenzia i prelievi per ID (non li copia): single source of truth.
 * Partizione per WBS (indice).
 */
import type { ControlloSalvato } from '../core/index.ts';
import { db } from './db.ts';

export function salvaControllo(c: ControlloSalvato): Promise<string> {
  return db.controlliCls.put(c);
}

export function caricaTuttiControlli(): Promise<ControlloSalvato[]> {
  return db.controlliCls.toArray();
}

export function caricaControlliWbs(wbs: string): Promise<ControlloSalvato[]> {
  return db.controlliCls.where('wbs').equals(wbs).toArray();
}

export function eliminaControllo(id: string): Promise<void> {
  return db.controlliCls.delete(id);
}
