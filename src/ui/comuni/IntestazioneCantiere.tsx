import { useStore } from '../../stato/store.ts';
import styles from './IntestazioneCantiere.module.css';

/**
 * Intestazione del cantiere (testo libero dal profilo-commessa), mostrata in cima
 * al REGISTRO e al CONTROLLO — UN SOLO componente riusato, una sola fonte (store).
 * Rispetta gli a-capo del testo libero. Se vuota: invito gentile a impostarla.
 */
export function IntestazioneCantiere() {
  const intestazione = useStore((s) => s.intestazione);
  const testo = intestazione.trim();

  if (!testo) {
    return (
      <p className={styles.invito}>
        Imposta l’intestazione del cantiere nell’anagrafica qui sopra.
      </p>
    );
  }
  return (
    <div className={styles.box} role="region" aria-label="Intestazione cantiere">
      <p className={styles.testo}>{intestazione}</p>
    </div>
  );
}
