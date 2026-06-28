/**
 * Tipi di dominio CALCESTRUZZO. In `core/` perché sono condivisibili e devono
 * poter essere estratti in `kerios-core` (M11). TS PURO (niente React/DOM/io).
 *
 * Fonte: docs/dominio-ntc.md §1 e §3. Modella il CICLO DI VITA a 3 fasi: i campi
 * di Fase 2 (trasmesso) e Fase 3 (refertato) sono OPZIONALI; lo stato è DERIVATO
 * (non un campo digitato). Il modello regge l'inserimento incrementale (M9) fin
 * da ora, anche se il form arriva dopo.
 */

export type StatoPrelievo = 'verbale' | 'trasmesso' | 'refertato';

/** Singolo cubetto/provino del verbale (lettere A..D). */
export interface Provino {
  lettera?: string;
  note?: string;
}

export interface Prelievo {
  id: string;

  // --- Fase 1: VERBALE (sempre presenti) ---
  verbale: string;
  data: string; // data verbale, gg/mm/aaaa
  wbs: string;
  parte: string;
  rck: number;
  mix: string;
  ddt?: string; // numero DDT del registro (il FILE/allegato è M5)
  impianto?: string; // fornitore/impianto di betonaggio
  note?: string;
  massaVolumica?: number; // kg/m³ (UNI EN 12390-7), colonna prima di Rck
  volumeGetto?: number; // m³ (avviso limite 300 m³)
  slump?: number; // mm, consistenza al getto
  oraPartenza?: string; // hh:mm
  oraArrivo?: string; // hh:mm
  oraScarico?: string; // hh:mm

  // --- Fase 2: TRASMESSO (opzionali finché non si invia la richiesta) ---
  protRichiesta?: string; // protocollo RICHIESTA D.L. (CSV col. 7; ex 'lettera')
  dataRichiesta?: string;
  protRicezione?: string;
  dataRicezione?: string;

  // --- Fase 3: REFERTATO (opzionali finché non arriva il certificato) ---
  certificato?: string;
  dataCertificato?: string;
  laboratorio?: string;
  dataProva?: string;
  r1?: number; // N/mm² — resistenza del 1° provino provato
  r2?: number; // N/mm² — resistenza del 2° provino provato

  // --- Documenti collegati (RIFERIMENTI per NOME-FILE; i FILE vivono in
  //     <materiale>/<WBS>/{pdf,allegati} — la CARTELLA è la verità, non l'handle).
  //     Il numero in tabella è il LINK: ogni dato documentale ha il suo file. ---
  certificatoFile?: string; // PDF del certificato di prova, in pdf/
  verbaleFile?: string; // PDF del verbale di prelievo, in pdf/
  ddtFile?: string; // PDF del DDT (1 per prelievo, anche fonte dati), in allegati/
  mixFile?: string; // PDF della sottomissione/mix design, in allegati/
  protRichiestaFile?: string; // PDF della lettera di richiesta D.L., in allegati/
  protRicezioneFile?: string; // PDF della ricezione D.L., in allegati/
  allegati?: AllegatoFile[]; // altri allegati (foto, ecc.), in allegati/

  // derivati (calcolati, non digitati): rmedio = (r1+r2)/2; stato = statoPrelievo(p)
}

/**
 * Riferimento a un file allegato, per NOME nella cartella nota (la verità). NON
 * un handle tecnico: sopravvive a spostamenti/sync perché Kerios lo ritrova
 * navigando la cartella. La `categoria` predispone l'acciaio (colate PIÙ d'una,
 * trasporto) senza implementarlo ora.
 */
export interface AllegatoFile {
  nome: string; // nome-file relativo nella cartella allegati/ della WBS
  categoria?: 'ddt' | 'colata' | 'trasporto' | 'foto' | 'altro';
}

export interface EsitoValidita {
  scartoPct: number; // arrotondato a 2 decimali (come il documento del PO)
  valido: boolean;
}

/** Semaforo PRELIMINARE sul singolo prelievo (§1.4-septies). NON è il verdetto NTC. */
export type SemaforoPrelievo = 'conforme' | 'da_verificare' | 'fuori_soglia';

export interface EsitoPreliminare {
  stato: SemaforoPrelievo;
  /** etichetta breve testuale (mai solo colore). */
  etichetta: string;
  note: string[];
}

export type TipoControllo = 'A' | 'B';

export interface Disuguaglianza {
  richiesto: number;
  valore: number;
  ok: boolean;
}

/** Strategie di raggruppamento (§1.4-quater). La strategia PROPONE, l'utente DISPONE. */
export type ModoRaggruppamento = 'auto' | 'assistito' | 'manuale';

/** Proposta EDITABILE di un gruppo di prelievi (il motore NTC è ignaro della strategia). */
export interface ProtostaControllo {
  prelieviIds: string[];
  avvisi: string[];
}

/** Controllo salvato: referenzia i prelievi per ID (non li copia — single source of truth). */
export interface ControlloSalvato {
  id: string;
  wbs: string;
  tipo: TipoControllo;
  rck: number;
  mix?: string;
  prelieviIds: string[];
  /** 'incompleto' = gruppo con n sotto il minimo del tipo (non è un controllo valido). */
  esito: 'conforme' | 'non_conforme' | 'incompleto';
  n: number; // numero prelievi del controllo (snapshot)
  rckEffettiva?: number; // solo Tipo A
  forzato: boolean; // l'utente ha confermato nonostante avvisi
  generato: string; // ISO timestamp
  /** OPERA specifica del controllo, testo libero (es. "TOMBINO SCATOLARE TO59 - pk 7+624"). */
  opera?: string;
  /** PDF del documento di controllo ST36 (generato in M6), in pdf/. M5: solo il campo. */
  documentoControllo?: string;
}

export interface RisultatoControllo {
  tipo: TipoControllo;
  n: number;
  rck: number;
  rcm28: number; // media delle Rc (N/mm²)
  rcmin: number; // minimo delle Rc (N/mm²)
  /** MIN(Rmin+3,5; Rm−3,5). SOLO Tipo A (undefined per Tipo B, decisione CTO). */
  rckEffettiva?: number;
  s?: number; // scarto quadratico medio (n−1) — solo Tipo B
  cv?: number; // coefficiente di variazione — solo Tipo B
  disug1: Disuguaglianza;
  disug2: Disuguaglianza;
  conforme: boolean;
  forzato: boolean; // true se l'utente conferma nonostante gli avvisi
  avvisi: string[];
  miscelaOmogenea: boolean; // false se i prelievi hanno mix diversi
}
