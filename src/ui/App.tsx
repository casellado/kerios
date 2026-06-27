import { Link, Route, Routes } from 'react-router-dom';
import { Home } from './Home.tsx';
import { InCostruzione } from './comuni/InCostruzione.tsx';
import { ClsPage } from './cls/ClsPage.tsx';
import styles from './App.module.css';

/** Le tre porte: rotta canonica + etichetta + materiale (per gli accenti). */
export const PORTE = [
  { path: '/calcestruzzi', label: 'Calcestruzzi', mat: 'cls' as const },
  { path: '/acciaio', label: 'Acciaio', mat: 'steel' as const },
  { path: '/quadro', label: 'Quadro generale', mat: 'quadro' as const },
];

export function App() {
  return (
    <div className={styles.app}>
      <a href="#contenuto" className={styles.skip}>
        Salta al contenuto
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label="Kerios — vai alla home">
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.brandName}>Kerios</span>
          <span className={styles.brandSub}>Controlli di accettazione · NTC 2018</span>
        </Link>
      </header>

      <main id="contenuto" className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calcestruzzi" element={<ClsPage />} />
          <Route
            path="/acciaio"
            element={
              <InCostruzione
                titolo="Acciaio"
                descrizione="Controllo di accettazione tondini B450C/B450A e rete elettrosaldata (§ 11.3.2)."
              />
            }
          />
          <Route
            path="/quadro"
            element={
              <InCostruzione
                titolo="Quadro generale"
                descrizione="Vista aggregata per WBS/opera, proiezione automatica dei controlli cls e acciaio."
              />
            }
          />
          <Route
            path="*"
            element={
              <InCostruzione
                titolo="Pagina non trovata"
                descrizione="La rotta richiesta non esiste. Torna alla home per le tre porte."
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
