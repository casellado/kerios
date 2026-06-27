import type { EsitoPreliminare, StatoPrelievo } from '../../core/index.ts';
import styles from './Semaforo.module.css';

const STATO_LABEL: Record<StatoPrelievo, string> = {
  verbale: 'In attesa (verbale)',
  trasmesso: 'Trasmesso al lab.',
  refertato: 'Refertato',
};

interface Props {
  preliminare: EsitoPreliminare | null;
  stato: StatoPrelievo;
}

/**
 * Esito di riga: se refertato mostra il semaforo PRELIMINARE; altrimenti lo stato
 * del ciclo di vita. Lo stato è SEMPRE comunicato con testo+forma, non solo colore
 * (CLAUDE.md §5). Il titolo riporta le note (tooltip).
 */
export function Semaforo({ preliminare, stato }: Props) {
  if (!preliminare) {
    return (
      <span className={`${styles.badge} ${styles.neutro}`} data-stato={stato}>
        <span className={styles.dot} aria-hidden="true" />
        {STATO_LABEL[stato]}
      </span>
    );
  }
  return (
    <span
      className={`${styles.badge} ${styles[preliminare.stato]}`}
      data-esito={preliminare.stato}
      title={preliminare.note.join(' ')}
    >
      <span className={styles.dot} aria-hidden="true" />
      {preliminare.etichetta}
    </span>
  );
}
