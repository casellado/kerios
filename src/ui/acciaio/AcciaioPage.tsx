import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { caricaTuttiPrelieviAcciaio } from '../../io/importaAcciaio.ts';
import { allineaVersioneCache } from '../../io/workspace.ts';
import { useStore } from '../../stato/store.ts';
import { CartellaLavoro } from '../cls/CartellaLavoro.tsx';
import { AnagraficaCantiere } from '../cls/AnagraficaCantiere.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import { InCostruzione } from '../comuni/InCostruzione.tsx';
import { ImportRegistroAcciaio } from './ImportRegistroAcciaio.tsx';
import { TabellaPrelieviAcciaio } from './TabellaPrelieviAcciaio.tsx';
import styles from '../cls/ClsPage.module.css';

type Scheda = 'registro' | 'controlli' | 'schede';

/**
 * Porta Acciaio (§ 11.3.2) — gemella di ClsPage, MODULO PARALLELO al cls. Fase 1:
 * tab Registro funzionante (import AC1 + tabella con esiti calcolati). Controlli e
 * Schede export arrivano nella fase 2 (controllo ogni 30 t + export template ST36).
 */
export function AcciaioPage() {
  const setPrelieviAcciaio = useStore((s) => s.setPrelieviAcciaio);
  const revisioneDati = useStore((s) => s.revisioneDati);
  const [scheda, setScheda] = useState<Scheda>('registro');

  useEffect(() => {
    let attivo = true;
    void (async () => {
      await allineaVersioneCache();
      const p = await caricaTuttiPrelieviAcciaio();
      if (!attivo) return;
      setPrelieviAcciaio(p);
    })().catch(() => {});
    return () => {
      attivo = false;
    };
  }, [setPrelieviAcciaio, revisioneDati]);

  return (
    <section>
      <header className={styles.intestazione}>
        <div>
          <p className={styles.eyebrow}>Acciaio · § 11.3.2</p>
          <h1 className={styles.titolo}>Controlli di accettazione — Acciaio B450C</h1>
        </div>
        <Link to="/" className={styles.back}>
          ← Tre porte
        </Link>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Sezioni acciaio">
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
          <ImportRegistroAcciaio />
          <TabellaPrelieviAcciaio />
        </>
      ) : (
        <InCostruzione
          titolo={scheda === 'controlli' ? 'Controlli di accettazione' : 'Schede export'}
          descrizione="Fase 2 del modulo acciaio: raggruppamento per Ø + produttore (ogni 30 t) ed export del documento ST36 acciaio compilando il template."
        />
      )}
    </section>
  );
}
