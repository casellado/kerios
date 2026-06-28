import { useEffect, useId, useRef } from 'react';
import styles from './DialogModifiche.module.css';

interface Props {
  /** Azione in corso che provocherebbe la perdita (es. «scollegare»). */
  azione?: string;
  onSalvaEProcedi: () => void;
  onProcediSenzaSalvare: () => void;
  onAnnulla: () => void;
}

/**
 * Dialog modale a 3 vie per «modifiche non salvate» (M4 micro-fix). Accessibile:
 * role=dialog + aria-modal, focus sul pulsante primario all'apertura, Esc =
 * Annulla, clic sullo sfondo = Annulla, focus restituito all'elemento di
 * partenza alla chiusura. Coerente con filosofia-kerios: l'utente decide, niente
 * perdita di lavoro di nascosto.
 */
export function DialogModifiche({
  azione = 'scollegare',
  onSalvaEProcedi,
  onProcediSenzaSalvare,
  onAnnulla,
}: Props) {
  const titoloId = useId();
  const descrId = useId();
  const primarioRef = useRef<HTMLButtonElement>(null);
  const origineRef = useRef<Element | null>(null);
  // imperativo per i pulsanti ("scollegare" → "scollega", "ricaricare" → "ricarica");
  // l'infinito `azione` resta nella frase ("…prima di scollegare?").
  const imperativo = azione.replace(/re$/, '');

  useEffect(() => {
    origineRef.current = document.activeElement;
    primarioRef.current?.focus();
    return () => {
      // restituisce il focus a chi ha aperto il dialog
      (origineRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onAnnulla(); // clic fuori = Annulla
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titoloId}
        aria-describedby={descrId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onAnnulla();
        }}
      >
        <h2 id={titoloId} className={styles.titolo}>
          Modifiche non salvate
        </h2>
        <p id={descrId} className={styles.testo}>
          Hai modifiche non salvate. Vuoi salvarle prima di {azione}?
        </p>
        <div className={styles.azioni}>
          <button
            ref={primarioRef}
            type="button"
            className={styles.primario}
            onClick={onSalvaEProcedi}
          >
            Salva e {imperativo}
          </button>
          <button type="button" className={styles.distruttivo} onClick={onProcediSenzaSalvare}>
            {imperativo[0].toUpperCase() + imperativo.slice(1)} senza salvare
          </button>
          <button type="button" className={styles.tenue} onClick={onAnnulla}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
