/**
 * Persistenza del PROFILO COMMESSA (profilo-commessa.json nella cartella).
 *
 * Oggi `workspace.creaStruttura` scrive un guscio `{schema, commessa}`; qui lo si
 * LEGGE (prima non avveniva) e lo si RISCRIVE con l'intestazione di cantiere a
 * testo libero. Migrazione indolore: profilo assente o senza `intestazione` →
 * intestazione vuota, nessun blocco.
 */
import { SCHEMA_PROFILO, type ProfiloCommessa } from '../core/index.ts';
import { FILE_PROFILO, leggiJson, scriviJson, type HandleCartella } from './workspace.ts';

/** Legge il profilo dalla cartella; null se assente (commessa nuova/vecchia). */
export async function caricaProfilo(dir: HandleCartella): Promise<ProfiloCommessa | null> {
  const raw = await leggiJson<Partial<ProfiloCommessa>>(dir, FILE_PROFILO);
  if (raw == null) return null;
  return {
    schema: SCHEMA_PROFILO,
    commessa: raw.commessa ?? dir.name,
    ...(raw.intestazione != null ? { intestazione: raw.intestazione } : {}),
  };
}

/** Riscrive il profilo nella cartella (atomico). */
export async function salvaProfilo(dir: HandleCartella, profilo: ProfiloCommessa): Promise<void> {
  await scriviJson(dir, FILE_PROFILO, profilo);
}
