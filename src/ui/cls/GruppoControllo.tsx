import { useMemo } from 'react';
import type { Prelievo, Soglie, TipoControllo } from '../../core/index.ts';
import { calcolaControllo, avvisiGruppo, resistenzaPrelievo } from '../../domain/index.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import styles from './GruppoControllo.module.css';

interface Props {
  indice: number;
  prelievi: Prelievo[];
  disponibili: Prelievo[];
  soglie: Soglie;
  tipoForzato: TipoControllo | undefined;
  onRimuovi: (id: string) => void;
  onAggiungi: (id: string) => void;
  onSetTipo: (t: TipoControllo | undefined) => void;
  onElimina: () => void;
  onSalva: (forzato: boolean) => void;
}

function fmt(x: number | undefined): string {
  return formattaNumeroIt(x, 2);
}

export function GruppoControllo(props: Props) {
  const { indice, prelievi, disponibili, soglie, tipoForzato } = props;

  const esito = useMemo(
    () =>
      tipoForzato
        ? calcolaControllo(prelievi, { soglie, tipo: tipoForzato })
        : calcolaControllo(prelievi, { soglie }),
    [prelievi, soglie, tipoForzato],
  );
  const r = esito.risultato;
  const avvisi = useMemo(() => {
    const comp = avvisiGruppo(prelievi, soglie);
    return [...new Set([...comp, ...r.avvisi])];
  }, [prelievi, soglie, r.avvisi]);

  const tipoDiverso = tipoForzato != null && tipoForzato !== esito.suggerimento.tipo;
  const vuoto = prelievi.length === 0;

  return (
    <article className={styles.card} aria-label={`Controllo ${indice}`}>
      <header className={styles.testa}>
        <h3 className={styles.titolo}>Controllo {indice}</h3>
        {!vuoto && <EsitoBadge conforme={r.conforme} />}
        <button type="button" className={styles.elimina} onClick={props.onElimina}>
          Elimina gruppo
        </button>
      </header>

      {/* Tipo suggerito + eventuale forzatura (mai default silenzioso). */}
      <div className={styles.tipoRiga}>
        <span className={styles.motivo}>
          <strong>Tipo {esito.tipoApplicato}</strong> · {esito.suggerimento.motivo}
        </span>
        <label className={styles.tipoSel}>
          <span className={styles.tipoLbl}>Tipo</span>
          <select
            value={tipoForzato ?? ''}
            onChange={(e) =>
              props.onSetTipo(e.target.value === '' ? undefined : (e.target.value as TipoControllo))
            }
          >
            <option value="">Suggerito ({esito.suggerimento.tipo})</option>
            <option value="A">Forza A</option>
            <option value="B">Forza B</option>
          </select>
        </label>
        {tipoDiverso && <span className={styles.forzaturaTipo}>tipo forzato dall'utente</span>}
      </div>

      {/* Prelievi del gruppo (editabili). */}
      <table className={styles.prelievi}>
        <caption className={styles.srOnly}>Prelievi del controllo {indice}</caption>
        <thead>
          <tr>
            <th scope="col">Verbale</th>
            <th scope="col">Parte d'opera</th>
            <th scope="col" className={styles.num}>
              Rck
            </th>
            <th scope="col" className={styles.num}>
              R medio
            </th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {prelievi.map((p) => (
            <tr key={p.id}>
              <th scope="row" className={styles.code}>
                {p.verbale}
              </th>
              <td>{p.parte}</td>
              <td className={styles.num}>{fmt(p.rck)}</td>
              <td className={styles.num}>{fmt(resistenzaPrelievo(p))}</td>
              <td className={styles.num}>
                <button
                  type="button"
                  className={styles.togli}
                  onClick={() => props.onRimuovi(p.id)}
                  aria-label={`Togli ${p.verbale} dal controllo ${indice}`}
                >
                  Togli
                </button>
              </td>
            </tr>
          ))}
          {vuoto && (
            <tr>
              <td colSpan={5} className={styles.vuoto}>
                Nessun prelievo. Aggiungine dal menu sotto.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {disponibili.length > 0 && (
        <label className={styles.aggiungi}>
          <span className={styles.tipoLbl}>Aggiungi prelievo</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) props.onAggiungi(e.target.value);
            }}
          >
            <option value="">— scegli —</option>
            {disponibili.map((p) => (
              <option key={p.id} value={p.id}>
                {p.verbale} · {p.parte} · R {fmt(resistenzaPrelievo(p))}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Risultato NTC (tutti i calcoli dal dominio). */}
      {!vuoto && (
        <div className={styles.risultato}>
          <dl className={styles.griglia}>
            <div>
              <dt>n prelievi</dt>
              <dd className={styles.num}>{r.n}</dd>
            </div>
            <div>
              <dt>Rcm,28</dt>
              <dd className={styles.num}>{fmt(r.rcm28)}</dd>
            </div>
            <div>
              <dt>Rc,min</dt>
              <dd className={styles.num}>{fmt(r.rcmin)}</dd>
            </div>
            {r.tipo === 'A' ? (
              <div>
                <dt>Rck effettiva</dt>
                <dd className={`${styles.num} ${styles.evidenza}`}>{fmt(r.rckEffettiva)}</dd>
              </div>
            ) : (
              <>
                <div>
                  <dt>s (n−1)</dt>
                  <dd className={styles.num}>{fmt(r.s)}</dd>
                </div>
                <div>
                  <dt>CV</dt>
                  <dd className={styles.num}>{formattaNumeroIt(r.cv, 3)}</dd>
                </div>
              </>
            )}
          </dl>

          <ul className={styles.disug}>
            <li className={r.disug1.ok ? styles.ok : styles.no}>
              {r.disug1.ok ? '✓' : '✕'} Disug. 1: {fmt(r.disug1.valore)} ≥ {fmt(r.disug1.richiesto)}
            </li>
            <li className={r.disug2.ok ? styles.ok : styles.no}>
              {r.disug2.ok ? '✓' : '✕'} Disug. 2 (R<sub>min</sub>): {fmt(r.disug2.valore)} ≥{' '}
              {fmt(r.disug2.richiesto)}
            </li>
          </ul>

          {avvisi.length > 0 && (
            <ul className={styles.avvisi} aria-label="Avvisi del controllo">
              {avvisi.map((a) => (
                <li key={a}>⚠ {a}</li>
              ))}
            </ul>
          )}

          <div className={styles.azioni}>
            <button
              type="button"
              className={avvisi.length > 0 ? styles.forza : styles.salva}
              onClick={() => props.onSalva(avvisi.length > 0)}
            >
              {avvisi.length > 0 ? 'Forza e salva' : 'Salva controllo'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
