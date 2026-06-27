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
}

export const useStore = create<StatoApp>((set) => ({
  wbsAttiva: null,
  selezionaWbs: (wbs) => set({ wbsAttiva: wbs }),

  soglie: SOGLIE_DEFAULT,
  setSoglie: (soglie) => set({ soglie }),

  prelievi: [],
  setPrelievi: (prelievi) => set({ prelievi }),
}));
