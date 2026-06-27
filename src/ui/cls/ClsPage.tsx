import { Link } from 'react-router-dom';
import styles from './ClsPage.module.css';

/**
 * Porta Calcestruzzi — è la fetta verticale che si costruisce per prima
 * (roadmap: import → controllo → documento). In M0 è la landing del modulo:
 * navigabile e distinta dalle aree "in costruzione". Engine NTC = M1, import = M2.
 */
export function ClsPage() {
  return (
    <section className={styles.box} aria-labelledby="cls-titolo">
      <p className={styles.eyebrow}>Calcestruzzi · § 11.2.5</p>
      <h1 id="cls-titolo" className={styles.titolo}>
        Controlli di accettazione — Calcestruzzo
      </h1>
      <p className={styles.desc}>
        Fondamenta pronte. Le prossime tappe portano questo modulo dall'import del registro fino al
        documento di controllo:
      </p>
      <ol className={styles.passi}>
        <li>
          <span className={styles.tag}>M1</span> Engine NTC verificato (validità prelievo,
          Tipo&nbsp;A, Tipo&nbsp;B) con test.
        </li>
        <li>
          <span className={styles.tag}>M2</span> Import registro (CSV/XLSX) e tabella filtrabile,
          per WBS.
        </li>
        <li>
          <span className={styles.tag}>M3</span> Selezione e generazione del controllo a schermo.
        </li>
      </ol>
      <Link to="/" className={styles.back}>
        ← Torna alle tre porte
      </Link>
    </section>
  );
}
