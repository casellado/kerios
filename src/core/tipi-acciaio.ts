/**
 * Tipi di dominio ACCIAIO (tondini B450C, NTC 2018 §11.3.2). In `core/` perché
 * condivisibili ed estraibili in `kerios-core` (M11). TS PURO (niente React/DOM/io).
 *
 * Modulo PARALLELO al cls: il calcestruzzo NON dipende da qui e viceversa.
 *
 * Struttura del prelievo (≠ cls): un prelievo = 3 SAGGI; ogni misura (fy, Agt,
 * ft/fy) è una TERNA (i 3 saggi sono 3 colonne sulla STESSA riga di registro),
 * più la prova di PIEGA (una per prelievo). Gli ESITI NON si importano: li calcola
 * domain/acciaio.ts con le soglie complete (il template ST36 ha formule parziali).
 *
 * Il modello nasce GIÀ con opera/ubicazione/denominazione separate (l'ST36 acciaio
 * le ha distinte); `parte` resta come ripiego se il registro non le separa a monte.
 */

/** Terna di misure dei 3 saggi del prelievo (stessa riga registro). */
export type Terna = [number, number, number];

export interface PrelievoAcciaio {
  id: string; // = `${wbs}|${verbale}` (stessa logica id del cls)

  // --- identificazione (sempre presenti) ---
  wbs: string;
  verbale: string; // "AC1-xxxx"
  data: string; // data prelievo, gg/mm/aaaa
  ddt?: string;

  // --- parte d'opera (modello a 3 campi; `parte` = ripiego legacy) ---
  opera?: string;
  ubicazione?: string;
  denominazione?: string;
  parte?: string;

  // --- materiale ---
  produttore: string; // marchio produttore (es. "FERRIERE NORD")
  diametro: number; // Ø mm
  colata?: string;

  // --- protocolli D.L. (fase trasmissione) ---
  protRichiestaDL?: string;
  dataRichiestaDL?: string;
  protRicezione?: string;
  dataRicezione?: string;

  // --- laboratorio / certificato (fase referto) ---
  laboratorio?: string;
  dataProva?: string; // = "data fine prove" nell'ST36
  certificato?: string;
  dataCertificato?: string;

  // --- risultati delle prove: 3 saggi per misura + piega ---
  fy: Terna; // tensione di snervamento fy [N/mm²]
  agt: Terna; // allungamento Agt [%]
  ftfy: Terna; // rapporto di incrudimento ft/fy
  piega: string; // esito prova piega dal certificato (es. "Positivo"/"F")

  note?: string;
  // NB: la colonna "ISPETTORE" del registro NON è qui (dato personale, mai importato).
}
