import { useId, useRef, useState } from 'react';
import {
  parseRegistroAcciaioCsv,
  verificaImportAcciaio,
  type EsitoImportAcciaio,
} from '../../io/csvAcciaio.ts';
import { parseRegistroAcciaioXlsx } from '../../io/xlsxAcciaio.ts';
import { salvaPrelieviAcciaio, caricaTuttiPrelieviAcciaio } from '../../io/importaAcciaio.ts';
import { useStore } from '../../stato/store.ts';
import styles from '../cls/ImportRegistro.module.css';

async function leggiFile(file: File): Promise<EsitoImportAcciaio> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) return parseRegistroAcciaioXlsx(bytes);
  return parseRegistroAcciaioCsv(bytes); // default: CSV (cp1252, ';')
}

type Stato = 'idle' | 'lavoro' | 'fatto' | 'errore';

export function ImportRegistroAcciaio() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const setPrelieviAcciaio = useStore((s) => s.setPrelieviAcciaio);
  const segnaSporco = useStore((s) => s.segnaSporco);
  const [stato, setStato] = useState<Stato>('idle');
  const [messaggio, setMessaggio] = useState('');
  const [trascina, setTrascina] = useState(false);

  async function importa(file: File) {
    setStato('lavoro');
    setMessaggio(`Lettura di ${file.name}…`);
    try {
      const esito = await leggiFile(file);
      // GUARDIA duale del cls: il file deve essere acciaio (verbali AC1). CLS o
      // file estraneo → rifiuto, nessun prelievo entra (errore reale del PO).
      const verifica = verificaImportAcciaio(esito.prelievi);
      if (!verifica.accettato) {
        setStato('errore');
        setMessaggio(verifica.messaggio ?? 'File non valido per l’acciaio.');
        return;
      }
      await salvaPrelieviAcciaio(esito.prelievi); // IndexedDB, batch
      const tutti = await caricaTuttiPrelieviAcciaio();
      setPrelieviAcciaio(tutti);
      segnaSporco();
      setStato('fatto');
      const err = esito.errori.length ? ` · ${esito.errori.length} avvisi` : '';
      setMessaggio(`Importati ${esito.prelievi.length} prelievi da ${file.name}${err}.`);
    } catch (e) {
      setStato('errore');
      setMessaggio(`Errore durante l'import: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function onInput(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (file) void importa(file);
  }
  function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    setTrascina(false);
    const file = ev.dataTransfer.files?.[0];
    if (file) void importa(file);
  }

  return (
    <section className={styles.box} aria-labelledby={`${inputId}-lbl`}>
      <h2 id={`${inputId}-lbl`} className={styles.titolo}>
        Importa registro acciaio
      </h2>
      <div
        className={`${styles.dropzone} ${trascina ? styles.attivo : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setTrascina(true);
        }}
        onDragLeave={() => setTrascina(false)}
        onDrop={onDrop}
      >
        <p className={styles.hint}>Trascina qui il file CSV o XLSX, oppure</p>
        <label htmlFor={inputId} className={styles.pulsante}>
          Scegli un file…
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className={styles.input}
          onChange={onInput}
        />
        <p className={styles.formati}>
          Formati: registro AC1 (CSV Windows-1252, separatore «;») o XLSX. Le colonne sono
          riconosciute per intestazione; la colonna «Ispettore» non viene importata.
        </p>
      </div>
      <p
        className={`${styles.stato} ${stato === 'errore' ? styles.statoErrore : ''}`}
        role="status"
        aria-live="polite"
      >
        {messaggio}
      </p>
    </section>
  );
}
