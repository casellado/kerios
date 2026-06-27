import { useId, useRef, useState } from 'react';
import { parseRegistroClsCsv, type EsitoImportCls } from '../../io/csv.ts';
import { parseRegistroClsXlsx } from '../../io/xlsx.ts';
import { salvaPrelieviCls, caricaTuttiPrelieviCls } from '../../io/importa.ts';
import { useStore } from '../../stato/store.ts';
import styles from './ImportRegistro.module.css';

async function leggiFile(file: File): Promise<EsitoImportCls> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) return parseRegistroClsXlsx(bytes);
  return parseRegistroClsCsv(bytes); // default: CSV (cp1252, ';')
}

type Stato = 'idle' | 'lavoro' | 'fatto' | 'errore';

export function ImportRegistro() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const setPrelievi = useStore((s) => s.setPrelievi);
  const [stato, setStato] = useState<Stato>('idle');
  const [messaggio, setMessaggio] = useState('');
  const [trascina, setTrascina] = useState(false);

  async function importa(file: File) {
    setStato('lavoro');
    setMessaggio(`Lettura di ${file.name}…`);
    try {
      const esito = await leggiFile(file);
      await salvaPrelieviCls(esito.prelievi); // IndexedDB, batch
      const tutti = await caricaTuttiPrelieviCls();
      setPrelievi(tutti);
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
        Importa registro
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
          Formati: registro CLS (CSV Windows-1252, separatore «;») o XLSX con le stesse colonne.
        </p>
      </div>
      {/* esiti annunciati via aria-live (CLAUDE.md §5) */}
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
