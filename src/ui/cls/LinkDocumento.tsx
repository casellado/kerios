import { useEffect, useId, useRef, useState } from 'react';
import type { Prelievo } from '../../core/index.ts';
import {
  apriDocCls,
  collegaDocCls,
  sottocartellaDi,
  type PresenzaWbs,
  type TipoDocCls,
} from '../../io/documenti.ts';
import { salvaPrelieviCls } from '../../io/importa.ts';
import { useStore } from '../../stato/store.ts';
import styles from './LinkDocumento.module.css';

/** Campi-file collegabili di un prelievo. */
export type CampoFile =
  | 'certificatoFile'
  | 'verbaleFile'
  | 'ddtFile'
  | 'mixFile'
  | 'protRichiestaFile'
  | 'protRicezioneFile';

interface Props {
  prelievo: Prelievo;
  tipo: TipoDocCls;
  campo: CampoFile;
  /** Numero/codice da mostrare (è il LINK). Se assente → "—". */
  valore: string | undefined;
  /** Data associata, mostrata compatta sotto il numero (opzionale). */
  data?: string | undefined;
  /** Mappa di presenza dei file nella WBS (per 📎/⚠); null = non nota. */
  presenza: PresenzaWbs | null;
}

/**
 * Link-su-dato (sostituisce le colonne "+ Allega" di M5): il NUMERO già presente
 * nel registro diventa cliccabile e apre un menù per allegare/aprire/sostituire/
 * rimuovere il PDF. Riusa il motore M5 (io/documenti.ts: collega/apri per
 * NOME-FILE, objectURL, degrado "ricollega"): cambia solo il TRIGGER.
 */
export function LinkDocumento({ prelievo: p, tipo, campo, valore, data, presenza }: Props) {
  const cartella = useStore((s) => s.cartella);
  const aggiornaPrelievo = useStore((s) => s.aggiornaPrelievo);
  const segnaSporco = useStore((s) => s.segnaSporco);
  const inputId = useId();
  const menuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const radice = useRef<HTMLSpanElement>(null);
  const primaVoce = useRef<HTMLButtonElement>(null);
  const [apertoMenu, setApertoMenu] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const [appenaCollegato, setAppenaCollegato] = useState(false);
  const [nonTrovato, setNonTrovato] = useState(false);

  const ref = p[campo];
  const sotto = sottocartellaDi(tipo);
  const presente: boolean | null = appenaCollegato
    ? true
    : ref
      ? presenza
        ? presenza[sotto].has(ref)
        : null
      : false;
  const mancante = !!ref && (presente === false || nonTrovato);

  // chiusura menù: clic fuori + focus sulla prima voce all'apertura
  useEffect(() => {
    if (!apertoMenu) return;
    primaVoce.current?.focus();
    function fuori(e: MouseEvent) {
      if (radice.current && !radice.current.contains(e.target as Node)) setApertoMenu(false);
    }
    document.addEventListener('mousedown', fuori);
    return () => document.removeEventListener('mousedown', fuori);
  }, [apertoMenu]);

  async function collega(file: File) {
    if (!cartella) return;
    setOccupato(true);
    try {
      const nome = await collegaDocCls(cartella, p.wbs, tipo, file);
      await salvaPrelieviCls([{ ...p, [campo]: nome }]);
      aggiornaPrelievo(p.id, { [campo]: nome });
      segnaSporco();
      setAppenaCollegato(true);
      setNonTrovato(false);
    } finally {
      setOccupato(false);
      setApertoMenu(false);
    }
  }

  async function apri() {
    if (!cartella || !ref) return;
    setApertoMenu(false);
    setOccupato(true);
    try {
      const file = await apriDocCls(cartella, p.wbs, tipo, ref);
      if (!file) {
        setNonTrovato(true); // spostato/rinominato fuori da Kerios → ricollega
        return;
      }
      setNonTrovato(false);
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setOccupato(false);
    }
  }

  function rimuovi() {
    setApertoMenu(false);
    if (!window.confirm('Rimuove il collegamento. Il file resta nella cartella.')) return;
    void salvaPrelieviCls([{ ...p, [campo]: undefined }]);
    aggiornaPrelievo(p.id, { [campo]: undefined });
    segnaSporco();
    setAppenaCollegato(false);
    setNonTrovato(false);
  }

  function onInput(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (file) void collega(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  // Nessun dato → niente da linkare.
  if (!valore) return <span className={styles.vuoto}>—</span>;

  // Senza cartella collegata il numero è solo testo (i documenti non sono gestibili).
  if (!cartella) {
    return (
      <span className={styles.soloTesto} title="Collega una cartella di lavoro per i documenti">
        {valore}
        {data ? <small className={styles.data}>{data}</small> : null}
      </span>
    );
  }

  const stato = ref ? (mancante ? 'mancante' : 'presente') : 'assente';

  return (
    <span className={styles.radice} ref={radice}>
      <button
        type="button"
        className={`${styles.link} ${styles[stato]}`}
        aria-haspopup="menu"
        aria-expanded={apertoMenu}
        aria-controls={menuId}
        disabled={occupato}
        onClick={() => setApertoMenu((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setApertoMenu(false);
        }}
      >
        {ref ? (mancante ? '⚠ ' : '📎 ') : ''}
        <span className={styles.numero}>{valore}</span>
        {data ? <small className={styles.data}>{data}</small> : null}
      </button>

      {apertoMenu && (
        <span id={menuId} role="menu" className={styles.menu}>
          {!ref ? (
            <button
              ref={primaVoce}
              type="button"
              role="menuitem"
              className={styles.voce}
              onClick={() => inputRef.current?.click()}
            >
              Allega documento…
            </button>
          ) : mancante ? (
            <>
              <button
                ref={primaVoce}
                type="button"
                role="menuitem"
                className={styles.voce}
                onClick={() => inputRef.current?.click()}
              >
                Ricollega (non trovato)…
              </button>
              <button type="button" role="menuitem" className={styles.voce} onClick={rimuovi}>
                Rimuovi collegamento
              </button>
            </>
          ) : (
            <>
              <button
                ref={primaVoce}
                type="button"
                role="menuitem"
                className={styles.voce}
                onClick={() => void apri()}
              >
                Apri documento
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.voce}
                onClick={() => inputRef.current?.click()}
              >
                Sostituisci…
              </button>
              <button type="button" role="menuitem" className={styles.voce} onClick={rimuovi}>
                Rimuovi collegamento
              </button>
            </>
          )}
        </span>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className={styles.input}
        onChange={onInput}
      />
    </span>
  );
}
