import styles from './EsitoBadge.module.css';

interface Props {
  conforme: boolean;
  forzato?: boolean;
  /** etichetta personalizzata; default Conforme/Non conforme. */
  testo?: string;
  /** 'incompleto' → stato NEUTRO (non rosso): il controllo è aperto, non bocciato. */
  stato?: 'incompleto';
}

/** Esito di un controllo: testo + colore + forma (mai solo colore). */
export function EsitoBadge({ conforme, forzato, testo, stato }: Props) {
  if (stato === 'incompleto') {
    return (
      <span className={`${styles.badge} ${styles.incompleto}`} role="status">
        <span className={styles.dot} aria-hidden="true">
          ◔
        </span>
        {testo ?? 'Incompleto'}
      </span>
    );
  }
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
