import { useId, useState } from 'react';
import { SCHEMA_PROFILO } from '../../core/index.ts';
import { salvaProfilo } from '../../io/profilo.ts';
import { useStore } from '../../stato/store.ts';
import styles from './AnagraficaCantiere.module.css';

/**
 * Anagrafica cantiere: una textarea per l'INTESTAZIONE a testo libero (niente
 * campi rigidi committente/CUP/CIG — decisione PO). Modifica lo store (la vedono
 * subito registro e controllo) e, su Salva, la scrive nel profilo-commessa della
 * cartella. Essenziale: textarea + salva.
 */
export function AnagraficaCantiere() {
  const intestazione = useStore((s) => s.intestazione);
  const setIntestazione = useStore((s) => s.setIntestazione);
  const direttoreLavori = useStore((s) => s.direttoreLavori);
  const setDirettoreLavori = useStore((s) => s.setDirettoreLavori);
  const segnaSporco = useStore((s) => s.segnaSporco);
  const cartella = useStore((s) => s.cartella);
  const id = useId();
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState(false);

  async function salva() {
    if (!cartella) {
      setErrore(true);
      setMessaggio('Collega una cartella commessa per salvare il profilo.');
      return;
    }
    try {
      // un solo profilo per commessa (lo stesso serve cls e acciaio)
      await salvaProfilo(cartella, {
        schema: SCHEMA_PROFILO,
        commessa: cartella.name,
        intestazione,
        ...(direttoreLavori.trim() ? { direttoreLavori: direttoreLavori.trim() } : {}),
      });
      setErrore(false);
      setMessaggio('Profilo commessa salvato (intestazione e Direttore Lavori).');
    } catch (e) {
      setErrore(true);
      setMessaggio(`Errore nel salvataggio: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <section className={styles.box} aria-labelledby={`${id}-lbl`}>
      <label id={`${id}-lbl`} htmlFor={id} className={styles.titolo}>
        Intestazione del cantiere
      </label>
      <p className={styles.aiuto}>
        Testo libero, su più righe: compare in cima al registro e al controllo (es. strada e
        lavori).
      </p>
      <textarea
        id={id}
        className={styles.area}
        rows={3}
        value={intestazione}
        placeholder={'Es.\nS.S. n. 106 "Jonica"\nLavori di costruzione del 3° Megalotto…'}
        onChange={(e) => {
          setIntestazione(e.target.value);
          segnaSporco();
        }}
      />

      <label htmlFor={`${id}-dl`} className={styles.titolo}>
        Direttore dei Lavori
      </label>
      <p className={styles.aiuto}>
        Solo il nome (es. «Ing. Biagio Marra»). Resta salvato localmente nella commessa; comparirà
        nella firma del documento ST36.
      </p>
      <input
        id={`${id}-dl`}
        type="text"
        className={styles.riga}
        value={direttoreLavori}
        placeholder="Es. Ing. Biagio Marra"
        onChange={(e) => {
          setDirettoreLavori(e.target.value);
          segnaSporco();
        }}
      />

      <div className={styles.azioni}>
        <button
          type="button"
          className={styles.salva}
          disabled={!cartella}
          onClick={() => void salva()}
        >
          Salva profilo commessa
        </button>
        <span
          className={`${styles.stato} ${errore ? styles.errore : ''}`}
          role="status"
          aria-live="polite"
        >
          {messaggio}
        </span>
      </div>
    </section>
  );
}
