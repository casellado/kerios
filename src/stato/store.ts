/**
 * Store applicativo — Zustand (architettura.md; niente Redux). Lo stato di
 * dominio resta SERIALIZZABILE (per il file di progetto, M4).
 */
import { create } from 'zustand';
import type { Prelievo, PrelievoAcciaio, Soglie } from '../core/index.ts';
import { SOGLIE_DEFAULT } from '../core/index.ts';
import type { HandleCartella } from '../io/workspace.ts';

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
  /** Aggiorna in-place un singolo prelievo (M5: salva il riferimento a un file). */
  aggiornaPrelievo: (id: string, patch: Partial<Prelievo>) => void;

  /** Prelievi ACCIAIO caricati in memoria (working set PARALLELO al cls). */
  prelieviAcciaio: PrelievoAcciaio[];
  setPrelieviAcciaio: (p: PrelievoAcciaio[]) => void;

  /**
   * Handle della cartella commessa attualmente collegata (M5: le celle-documento
   * vi copiano/aprono i PDF). null = nessuna cartella → documenti non gestibili.
   * Non serializzato (handle tecnico): vive solo in memoria per la sessione.
   */
  cartella: HandleCartella | null;
  setCartella: (h: HandleCartella | null) => void;

  /**
   * Intestazione del cantiere a TESTO LIBERO (dal profilo-commessa): mostrata in
   * cima al registro e al controllo. Caricata dal profilo al collegamento della
   * cartella; modificabile dall'anagrafica e salvata nel profilo.
   */
  intestazione: string;
  setIntestazione: (t: string) => void;

  /**
   * Direttore dei Lavori (solo nome) dal profilo-commessa: dato LOCALE, caricato
   * all'aggancio della cartella come l'intestazione; scritto nella firma dell'ST36.
   */
  direttoreLavori: string;
  setDirettoreLavori: (t: string) => void;

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
  aggiornaPrelievo: (id, patch) =>
    set((s) => ({ prelievi: s.prelievi.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  prelieviAcciaio: [],
  setPrelieviAcciaio: (prelieviAcciaio) => set({ prelieviAcciaio }),

  cartella: null,
  setCartella: (cartella) => set({ cartella }),

  intestazione: '',
  setIntestazione: (intestazione) => set({ intestazione }),

  direttoreLavori: '',
  setDirettoreLavori: (direttoreLavori) => set({ direttoreLavori }),

  revisioneDati: 0,
  ricarica: () => set((s) => ({ revisioneDati: s.revisioneDati + 1 })),

  sporco: false,
  segnaSporco: () => set({ sporco: true }),
  segnaPulito: () => set({ sporco: false }),
}));
