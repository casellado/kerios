import { useId, useRef, useState } from 'react';
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
import styles from './CellaDocumento.module.css';

interface Props {
  prelievo: Prelievo;
  tipo: TipoDocCls;
  /** Campo del prelievo che custodisce il NOME-FILE collegato. */
  campo: 'certificatoFile' | 'verbaleFile' | 'ddtFile';
  /** Presenza dei file nella WBS (per l'indicatore 📎/⚠); null = non nota. */
  presenza: PresenzaWbs | null;
}

/**
 * Cella-documento (M5): collega un PDF a un prelievo per NOME-FILE (drag&drop o
 * picker), lo apre al clic, mostra l'indicatore 📎 presente / — assente / ⚠ non
 * trovato, e degrada con grazia se il file è stato spostato fuori da Kerios.
 */
export function CellaDocumento({ prelievo: p, tipo, campo, presenza }: Props) {
  const cartella = useStore((s) => s.cartella);
  const aggiornaPrelievo = useStore((s) => s.aggiornaPrelievo);
  const segnaSporco = useStore((s) => s.segnaSporco);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [trascina, setTrascina] = useState(false);
  const [occupato, setOccupato] = useState(false);
  // override locale: subito dopo un collegamento il file ESISTE (la mappa di
  // presenza del giro precedente non lo sa ancora).
  const [appenaCollegato, setAppenaCollegato] = useState(false);
  const [nonTrovato, setNonTrovato] = useState(false);

  const ref = p[campo];
  const sotto = sottocartellaDi(tipo);
  // true=presente, false=mancante, null=non noto (nessun elenco): si tenta e si scopre all'apertura.
  const presente: boolean | null = appenaCollegato
    ? true
    : ref
      ? presenza
        ? presenza[sotto].has(ref)
        : null
      : false;

  async function collega(file: File) {
    if (!cartella) return;
    setOccupato(true);
    setNonTrovato(false);
    try {
      const nome = await collegaDocCls(cartella, p.wbs, tipo, file);
      await salvaPrelieviCls([{ ...p, [campo]: nome }]); // cache
      aggiornaPrelievo(p.id, { [campo]: nome }); // memoria
      segnaSporco(); // l'associazione va versata nel progetto (la verità)
      setAppenaCollegato(true);
    } catch {
      setNonTrovato(false);
    } finally {
      setOccupato(false);
    }
  }

  async function apri() {
    if (!cartella || !ref) return;
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

  function onInput(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (file) void collega(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  // Senza cartella i documenti non sono gestibili (la cartella è la verità).
  if (!cartella) {
    return (
      <span className={styles.muto} title="Collega una cartella di lavoro per gestire i documenti">
        {ref ? `📎 ${ref}` : '—'}
      </span>
    );
  }

  const mancante = ref && presente === false && !nonTrovato;

  return (
    <span
      className={`${styles.cella} ${trascina ? styles.trascina : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setTrascina(true);
      }}
      onDragLeave={() => setTrascina(false)}
      onDrop={(e) => {
        e.preventDefault();
        setTrascina(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void collega(file);
      }}
    >
      {ref && !mancante && !nonTrovato ? (
        <button
          type="button"
          className={styles.apri}
          disabled={occupato}
          title={`Apri ${ref}`}
          onClick={() => void apri()}
        >
          📎 <span className={styles.nome}>{ref}</span>
        </button>
      ) : ref && (mancante || nonTrovato) ? (
        <button
          type="button"
          className={styles.ricollega}
          disabled={occupato}
          title={`«${ref}» non trovato nella cartella — ricollega`}
          onClick={() => inputRef.current?.click()}
        >
          ⚠ non trovato — ricollega
        </button>
      ) : (
        <label
          htmlFor={inputId}
          className={styles.allega}
          title="Trascina un PDF qui o scegli un file"
        >
          + Allega
        </label>
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
