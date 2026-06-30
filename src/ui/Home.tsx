import { Link } from 'react-router-dom';
import { PORTE } from './App.tsx';
import styles from './Home.module.css';

const SOTTOTITOLI: Record<string, string> = {
  '/calcestruzzi': 'Controllo Tipo A e Tipo B — § 11.2.5',
  '/acciaio': 'Tondini B450C/B450A e rete — § 11.3.2',
  '/quadro': 'Vista aggregata per WBS/opera',
};

const STATO_PORTA: Record<string, 'attiva' | 'in_costruzione'> = {
  '/calcestruzzi': 'attiva',
  '/acciaio': 'attiva', // modulo acciaio completo (registro + schede + export ST36)
  '/quadro': 'in_costruzione',
};

export function Home() {
  return (
    <section aria-labelledby="home-titolo">
      <p className={styles.eyebrow}>Materiali strutturali · controlli di accettazione</p>
      <h1 id="home-titolo" className={styles.titolo}>
        Scegli un'area di lavoro
      </h1>

      <ul className={styles.porte}>
        {PORTE.map((porta) => {
          const stato = STATO_PORTA[porta.path];
          return (
            <li key={porta.path}>
              <Link
                to={porta.path}
                className={styles.porta}
                data-mat={porta.mat}
                aria-label={`${porta.label} — ${SOTTOTITOLI[porta.path]}${
                  stato === 'in_costruzione' ? ' (in costruzione)' : ''
                }`}
              >
                <span className={styles.accent} aria-hidden="true" />
                <span className={styles.corpo}>
                  <span className={styles.nome}>{porta.label}</span>
                  <span className={styles.sub}>{SOTTOTITOLI[porta.path]}</span>
                </span>
                {/* Stato comunicato con testo, non solo colore (a11y). */}
                {stato === 'in_costruzione' ? (
                  <span className={styles.badge}>in costruzione</span>
                ) : (
                  <span className={styles.freccia} aria-hidden="true">
                    →
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
