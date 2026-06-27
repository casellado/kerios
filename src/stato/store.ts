/**
 * Store applicativo — Zustand (scelto in architettura.md; niente Redux).
 *
 * M0: scaffold minimo del pattern. Lo stato di DOMINIO resta SERIALIZZABILE (per
 * il salvataggio nel file di progetto .kerios.json, M4). Qui teniamo solo la WBS
 * attiva, coerente con la partizione per WBS (si lavora una WBS alla volta).
 */
import { create } from 'zustand';

interface StatoApp {
  /** WBS attualmente caricata in memoria (partizione attiva). null = nessuna. */
  wbsAttiva: string | null;
  selezionaWbs: (wbs: string | null) => void;
}

export const useStore = create<StatoApp>((set) => ({
  wbsAttiva: null,
  selezionaWbs: (wbs) => set({ wbsAttiva: wbs }),
}));
