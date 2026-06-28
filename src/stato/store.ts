/**
 * Store applicativo — Zustand (architettura.md; niente Redux). Lo stato di
 * dominio resta SERIALIZZABILE (per il file di progetto, M4).
 */
import { create } from 'zustand';
import type { Prelievo, Soglie } from '../core/index.ts';
import { SOGLIE_DEFAULT } from '../core/index.ts';

interface StatoApp {
  /** WBS attualmente in lavorazione (partizione attiva). null = tutte. */
  wbsAttiva: string | null;
  selezionaWbs: (wbs: string | null) => void;

  /** Soglie attive (default finché non si caricano quelle esterne). */
  soglie: Soglie;
  setSoglie: (s: Soglie) => void;

  /** Prelievi cls caricati in memoria (working set). */
  prelievi: Prelievo[];
  setPrelievi: (p: Prelievo[]) => void;

  /**
   * Contatore di REVISIONE della cache (M4): lo si incrementa quando la cache
   * IndexedDB cambia fuori dal normale flusso (collegamento cartella, ricarica
   * dalla cartella, invalidazione versione). Le viste lo usano come dipendenza
   * per rileggere da IndexedDB. È un segnale, non un dato.
   */
  revisioneDati: number;
  ricarica: () => void;

  /**
   * Stato SPORCO (M4 micro-fix): true se ci sono modifiche ai dati di lavoro non
   * ancora salvate nel progetto (la cartella-verità). Acceso dalle mutazioni
   * della cache (salva/elimina/svuota un controllo, import); spento dopo un
   * salvataggio riuscito o un'ereditarietà dalla cartella (cache == verità).
   * Serve a chiedere conferma PRIMA di scollegare/cambiare cartella, solo quando
   * c'è davvero qualcosa da perdere (niente avvisi-rumore).
   */
  sporco: boolean;
  segnaSporco: () => void;
  segnaPulito: () => void;
}

export const useStore = create<StatoApp>((set) => ({
  wbsAttiva: null,
  selezionaWbs: (wbs) => set({ wbsAttiva: wbs }),

  soglie: SOGLIE_DEFAULT,
  setSoglie: (soglie) => set({ soglie }),

  prelievi: [],
  setPrelievi: (prelievi) => set({ prelievi }),

  revisioneDati: 0,
  ricarica: () => set((s) => ({ revisioneDati: s.revisioneDati + 1 })),

  sporco: false,
  segnaSporco: () => set({ sporco: true }),
  segnaPulito: () => set({ sporco: false }),
}));
