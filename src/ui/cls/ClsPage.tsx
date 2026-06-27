import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { caricaSoglieEsterne } from '../../io/configurazione.ts';
import { caricaTuttiPrelieviCls } from '../../io/importa.ts';
import { useStore } from '../../stato/store.ts';
import { ImportRegistro } from './ImportRegistro.tsx';
import { TabellaPrelievi } from './TabellaPrelievi.tsx';
import styles from './ClsPage.module.css';

/**
 * Porta Calcestruzzi (§ 11.2.5). M2: import del registro reale + tabella
 * filtrabile con semaforo preliminare e fasi temporali. I dati vivono in
 * IndexedDB (ritrovati al riavvio); il calcolo è tutto nel dominio.
 */
export function ClsPage() {
  const setSoglie = useStore((s) => s.setSoglie);
  const setPrelievi = useStore((s) => s.setPrelievi);

  useEffect(() => {
    let attivo = true;
    void caricaSoglieEsterne().then((s) => attivo && setSoglie(s));
    void caricaTuttiPrelieviCls()
      .then((p) => attivo && setPrelievi(p))
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, [setSoglie, setPrelievi]);

  return (
    <section>
      <header className={styles.intestazione}>
        <div>
          <p className={styles.eyebrow}>Calcestruzzi · § 11.2.5</p>
          <h1 className={styles.titolo}>Controlli di accettazione — Calcestruzzo</h1>
        </div>
        <Link to="/" className={styles.back}>
          ← Tre porte
        </Link>
      </header>

      <ImportRegistro />
      <TabellaPrelievi />
    </section>
  );
}
