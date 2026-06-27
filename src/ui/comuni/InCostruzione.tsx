import { Link } from 'react-router-dom';
import styles from './InCostruzione.module.css';

interface Props {
  titolo: string;
  descrizione: string;
}

/** Pagina segnaposto per le aree non ancora costruite (Acciaio, Quadro in M0). */
export function InCostruzione({ titolo, descrizione }: Props) {
  return (
    <section className={styles.box} aria-labelledby="ic-titolo">
      <p className={styles.eyebrow}>Area in preparazione</p>
      <h1 id="ic-titolo" className={styles.titolo}>
        {titolo}
      </h1>
      <p className={styles.stato}>
        <span className={styles.dot} aria-hidden="true" />
        In costruzione
      </p>
      <p className={styles.desc}>{descrizione}</p>
      <Link to="/" className={styles.back}>
        ← Torna alle tre porte
      </Link>
    </section>
  );
}
