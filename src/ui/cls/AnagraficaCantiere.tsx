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
  const segnaSporco = useStore((s) => s.segnaSporco);
  const cartella = useStore((s) => s.cartella);
  const id = useId();
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState(false);

  async function salva() {
    if (!cartella) {
      setErrore(true);
      setMessaggio('Collega una cartella commessa per salvare l’intestazione.');
      return;
    }
    try {
      await salvaProfilo(cartella, {
        schema: SCHEMA_PROFILO,
        commessa: cartella.name,
        intestazione,
      });
      setErrore(false);
      setMessaggio('Intestazione salvata nel profilo della commessa.');
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
      <div className={styles.azioni}>
        <button
          type="button"
          className={styles.salva}
          disabled={!cartella}
          onClick={() => void salva()}
        >
          Salva intestazione
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
