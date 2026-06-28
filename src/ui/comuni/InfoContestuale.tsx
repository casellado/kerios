import { useEffect, useId, useRef, useState } from 'react';
import styles from './InfoContestuale.module.css';

interface Props {
  /** Etichetta accessibile del pulsante (es. "Perché il DDT è allegato?"). */
  etichetta: string;
  /** Spiegazione breve (2-3 righe) del perché, con la citazione NTC esatta. */
  children: React.ReactNode;
}

/**
 * Info contestuale ⓘ (design.md). Pulsante discreto che apre una spiegazione
 * breve del PERCHÉ normativo di una scelta automatica. Accessibile: vero
 * `<button>` con aria-label/aria-expanded, popover annunciato, chiudibile con Esc
 * o clic fuori; mai solo hover. Coerente con filosofia-kerios (automatismo
 * trasparente).
 */
export function InfoContestuale({ etichetta, children }: Props) {
  const [aperto, setAperto] = useState(false);
  const popId = useId();
  const radice = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aperto) return;
    function fuori(e: MouseEvent) {
      if (radice.current && !radice.current.contains(e.target as Node)) setAperto(false);
    }
    document.addEventListener('mousedown', fuori);
    return () => document.removeEventListener('mousedown', fuori);
  }, [aperto]);

  return (
    <span className={styles.radice} ref={radice}>
      <button
        type="button"
        className={styles.icona}
        aria-label={etichetta}
        aria-expanded={aperto}
        aria-controls={popId}
        onClick={() => setAperto((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setAperto(false);
        }}
      >
        ⓘ
      </button>
      {aperto && (
        <span id={popId} role="note" className={styles.popover}>
          {children}
        </span>
      )}
    </span>
  );
}
