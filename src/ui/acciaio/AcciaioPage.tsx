import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { caricaTuttiPrelieviAcciaio } from '../../io/importaAcciaio.ts';
import { allineaVersioneCache } from '../../io/workspace.ts';
import { useStore } from '../../stato/store.ts';
import { CartellaLavoro } from '../cls/CartellaLavoro.tsx';
import { AnagraficaCantiere } from '../cls/AnagraficaCantiere.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import { ImportRegistroAcciaio } from './ImportRegistroAcciaio.tsx';
import { TabellaPrelieviAcciaio } from './TabellaPrelieviAcciaio.tsx';
import { SchedeViewAcciaio } from './SchedeViewAcciaio.tsx';
import styles from '../cls/ClsPage.module.css';
import info from './ControlliInfo.module.css';

type Scheda = 'registro' | 'controlli' | 'schede';

/**
 * Porta Acciaio (§ 11.3.2) — gemella di ClsPage, MODULO PARALLELO al cls. Tre tab:
 * Registro (import AC1 + esiti per prelievo), «Controlli di accettazione» (nota
 * informativa: per l'acciaio non c'è uno step separato — scelta di dominio) e
 * Schede export (raggruppa per WBS+produttore+Ø → documento ST36 dal template).
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
      ) : scheda === 'schede' ? (
        <SchedeViewAcciaio />
      ) : (
        <section className={info.box} aria-labelledby="ctrl-acc-titolo">
          <h2 id="ctrl-acc-titolo" className={info.titolo}>
            Controlli di accettazione — Acciaio B450C
          </h2>
          <p>
            Per l’acciaio non è previsto un controllo di accettazione separato come per il
            calcestruzzo. La conformità di ogni prelievo (3 saggi) è verificata direttamente secondo
            le soglie B450C — tensione di snervamento fy, allungamento Agt, rapporto ft/fy e prova
            di piega — ed è già visibile, prelievo per prelievo, nel tab «Registro» (esiti
            verde/rosso).
          </p>
          <p>
            Il documento ST36 di accettazione si genera nel tab «Schede export», dove i prelievi
            conformi sono raggruppati per WBS + produttore + diametro (il lotto di controllo
            previsto dalle NTC 2018 §11.3.2), fino a 18 prelievi per scheda.
          </p>
          <div className={info.azioni}>
            <button type="button" className={info.vai} onClick={() => setScheda('registro')}>
              Vai al Registro
            </button>
            <button type="button" className={info.vai} onClick={() => setScheda('schede')}>
              Vai a Schede export
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
