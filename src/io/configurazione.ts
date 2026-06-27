/**
 * Caricamento delle soglie ESTERNE (`public/soglie.json`) a runtime: così si
 * cambiano senza ricompilare (CLAUDE.md §1.4-octies). Se il file manca o è
 * malformato, si usano i default del codice — l'app non si rompe mai.
 */
import { caricaSoglie, SOGLIE_DEFAULT, type Soglie } from '../core/index.ts';

export async function caricaSoglieEsterne(url = '/soglie.json'): Promise<Soglie> {
  try {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) return SOGLIE_DEFAULT;
    const json: unknown = await resp.json();
    return caricaSoglie(json);
  } catch {
    return SOGLIE_DEFAULT;
  }
}
