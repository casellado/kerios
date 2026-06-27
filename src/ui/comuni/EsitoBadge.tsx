import styles from './EsitoBadge.module.css';

interface Props {
  conforme: boolean;
  forzato?: boolean;
  /** etichetta personalizzata; default Conforme/Non conforme. */
  testo?: string;
}

/** Esito di un controllo: testo + colore + forma (mai solo colore). */
export function EsitoBadge({ conforme, forzato, testo }: Props) {
  const label = testo ?? (conforme ? 'Conforme' : 'Non conforme');
  return (
    <span className={`${styles.badge} ${conforme ? styles.ok : styles.no}`} role="status">
      <span className={styles.dot} aria-hidden="true">
        {conforme ? '✓' : '✕'}
      </span>
      {label}
      {forzato ? <span className={styles.forzato}>· forzato</span> : null}
    </span>
  );
}
