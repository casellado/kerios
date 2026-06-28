import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { caricaSoglieEsterne } from '../../io/configurazione.ts';
import { caricaTuttiPrelieviCls } from '../../io/importa.ts';
import { allineaVersioneCache } from '../../io/workspace.ts';
import { useStore } from '../../stato/store.ts';
import { CartellaLavoro } from './CartellaLavoro.tsx';
import { AnagraficaCantiere } from './AnagraficaCantiere.tsx';
import { ImportRegistro } from './ImportRegistro.tsx';
import { TabellaPrelievi } from './TabellaPrelievi.tsx';
import { ControlliView } from './ControlliView.tsx';
import { SchedeView } from './SchedeView.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import styles from './ClsPage.module.css';

type Scheda = 'registro' | 'controlli' | 'schede';

/**
 * Porta Calcestruzzi (§ 11.2.5). Due schede: Registro (import + tabella, M2) e
 * Controlli di accettazione (raggruppamento + esito NTC, M3). I dati vivono in
 * IndexedDB; tutto il calcolo è nel dominio.
 */
export function ClsPage() {
  const setSoglie = useStore((s) => s.setSoglie);
  const setPrelievi = useStore((s) => s.setPrelievi);
  const revisioneDati = useStore((s) => s.revisioneDati);
  const [scheda, setScheda] = useState<Scheda>('registro');

  useEffect(() => {
    let attivo = true;
    void (async () => {
      // M4: prima di leggere, allinea la versione della cache (invalida l'eventuale
      // cache stantia). Poi carica da IndexedDB (rigenerata dalla cartella-verità
      // al collegamento). `revisioneDati` rifà partire questo load dopo un
      // collegamento/ricarica dalla cartella.
      await allineaVersioneCache();
      const [s, p] = await Promise.all([caricaSoglieEsterne(), caricaTuttiPrelieviCls()]);
      if (!attivo) return;
      setSoglie(s);
      setPrelievi(p);
    })().catch(() => {});
    return () => {
      attivo = false;
    };
  }, [setSoglie, setPrelievi, revisioneDati]);

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

      <div className={styles.tabs} role="tablist" aria-label="Sezioni calcestruzzo">
        <button
          type="button"
          role="tab"
          aria-selected={scheda === 'registro'}
          className={`${styles.tab} ${scheda === 'registro' ? styles.tabAttiva : ''}`}
          onClick={() => setScheda('registro')}
        >
          Registro
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scheda === 'controlli'}
          className={`${styles.tab} ${scheda === 'controlli' ? styles.tabAttiva : ''}`}
          onClick={() => setScheda('controlli')}
        >
          Controlli di accettazione
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scheda === 'schede'}
          className={`${styles.tab} ${scheda === 'schede' ? styles.tabAttiva : ''}`}
          onClick={() => setScheda('schede')}
        >
          Schede export
        </button>
      </div>

      <CartellaLavoro />
      <AnagraficaCantiere />

      {scheda === 'registro' ? (
        <>
          <IntestazioneCantiere />
          <ImportRegistro />
          <TabellaPrelievi />
        </>
      ) : scheda === 'controlli' ? (
        <ControlliView />
      ) : (
        <SchedeView />
      )}
    </section>
  );
}
