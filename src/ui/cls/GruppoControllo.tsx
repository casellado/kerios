import { useEffect, useId, useMemo, useState } from 'react';
import type { Prelievo, Soglie, TipoControllo } from '../../core/index.ts';
import {
  calcolaControllo,
  controlloCompleto,
  avvisiGruppo,
  verificaOmogeneita,
  resistenzaPrelievo,
  prelieviCompatibili,
  parseDataIt,
} from '../../domain/index.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import styles from './GruppoControllo.module.css';

interface Props {
  indice: number;
  prelievi: Prelievo[];
  /** tutti i prelievi refertati (per il menu "aggiungi", filtrati per compatibilità). */
  refertati: Prelievo[];
  /** id già impegnati altrove (no media mobile): esclusi dal menu. */
  assegnati: Set<string>;
  soglie: Soglie;
  tipoForzato: TipoControllo | undefined;
  onRimuovi: (id: string) => void;
  onAggiungi: (id: string) => void;
  onSetTipo: (t: TipoControllo | undefined) => void;
  onElimina: () => void;
  onSalva: () => Promise<void> | void;
}

const fmt = (x: number | undefined): string => formattaNumeroIt(x, 2);
const CAP_MENU = 100;

export function GruppoControllo(props: Props) {
  const { indice, prelievi, refertati, assegnati, soglie, tipoForzato } = props;
  const ricercaId = useId();
  const [ricerca, setRicerca] = useState('');
  const [salvato, setSalvato] = useState(false);

  const esito = useMemo(
    () =>
      tipoForzato
        ? calcolaControllo(prelievi, { soglie, tipo: tipoForzato })
        : calcolaControllo(prelievi, { soglie }),
    [prelievi, soglie, tipoForzato],
  );
  const r = esito.risultato;
  const completo = controlloCompleto(r, soglie);
  const omog = useMemo(() => verificaOmogeneita(prelievi), [prelievi]);
  const vuoto = prelievi.length === 0;

  // avvisi NORMALI (superabili): esclusi omogeneità (banner forte) e n<minimo (stato incompleto)
  const avvisi = useMemo(() => {
    const comp = avvisiGruppo(prelievi, soglie);
    return [...new Set([...comp, ...r.avvisi])].filter(
      (a) => !/omogen/i.test(a) && !/almeno 3|richiede n/i.test(a),
    );
  }, [prelievi, soglie, r.avvisi]);
  const richiedeForza = avvisi.length > 0 || !omog.omogenea;

  // reset del feedback "salvato" quando il gruppo cambia
  const firma = prelievi.map((p) => p.id).join(',') + '|' + (tipoForzato ?? '');
  useEffect(() => setSalvato(false), [firma]);

  // menu "aggiungi": SOLO compatibili — stesso mix, non assegnati, ordinati per
  // vicinanza temporale ai prelievi del gruppo (P4, problema di scala).
  const mixGruppo = prelievi[0]?.mix;
  const compatibili = useMemo(() => {
    const dateRiferimento = prelievi
      .map((p) => parseDataIt(p.data))
      .filter((d): d is number => d != null);
    const base = prelieviCompatibili(refertati, {
      mix: mixGruppo,
      esclusi: assegnati,
      dateRiferimento,
    });
    const q = ricerca.trim().toLowerCase();
    return q ? base.filter((p) => `${p.verbale} ${p.parte}`.toLowerCase().includes(q)) : base;
  }, [refertati, assegnati, mixGruppo, prelievi, ricerca]);
  const menu = compatibili.slice(0, CAP_MENU);

  async function handleSalva() {
    await props.onSalva();
    setSalvato(true);
  }

  const mancanti = Math.max(0, soglie.cls.nPrelieviTipoAMin - r.n);

  return (
    <article className={styles.card} aria-label={`Controllo ${indice}`}>
      <header className={styles.testa}>
        <h3 className={styles.titolo}>Controllo {indice}</h3>
        {vuoto ? null : completo ? (
          <EsitoBadge conforme={r.conforme} />
        ) : (
          <EsitoBadge conforme={false} stato="incompleto" testo="Incompleto · aperto" />
        )}
        <button type="button" className={styles.elimina} onClick={props.onElimina}>
          Elimina gruppo
        </button>
      </header>

      {/* Tipo suggerito + forzatura (solo per gruppi non vuoti). */}
      {!vuoto && (
        <div className={styles.tipoRiga}>
          <span className={styles.motivo}>
            <strong>Tipo {esito.tipoApplicato}</strong> · {esito.suggerimento.motivo}
          </span>
          <label className={styles.tipoSel}>
            <span className={styles.tipoLbl}>Tipo</span>
            <select
              value={tipoForzato ?? ''}
              onChange={(e) =>
                props.onSetTipo(
                  e.target.value === '' ? undefined : (e.target.value as TipoControllo),
                )
              }
            >
              <option value="">Suggerito ({esito.suggerimento.tipo})</option>
              <option value="A">Forza A</option>
              <option value="B">Forza B</option>
            </select>
          </label>
        </div>
      )}

      {/* Prelievi del gruppo (editabili). */}
      <table className={styles.prelievi}>
        <caption className={styles.srOnly}>Prelievi del controllo {indice}</caption>
        <thead>
          <tr>
            <th scope="col">Verbale</th>
            <th scope="col">Mix</th>
            <th scope="col">Data</th>
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
              <td className={styles.code}>{p.mix}</td>
              <td>{p.data}</td>
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
              <td colSpan={6} className={styles.vuoto}>
                Nessun prelievo. Aggiungine dal menu sotto.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Menu AGGIUNGI: solo prelievi compatibili + ricerca (scala). */}
      <div className={styles.aggiungiBox}>
        <label className={styles.aggiungi}>
          <span className={styles.tipoLbl}>
            Aggiungi prelievo {mixGruppo ? `(mix ${mixGruppo})` : ''}
          </span>
          <select
            value=""
            aria-describedby={`${ricercaId}-hint`}
            onChange={(e) => {
              if (e.target.value) props.onAggiungi(e.target.value);
            }}
          >
            <option value="">
              {menu.length === 0 ? '— nessun prelievo compatibile —' : '— scegli —'}
            </option>
            {menu.map((p) => (
              <option key={p.id} value={p.id}>
                {p.verbale} · {p.data} · R {fmt(resistenzaPrelievo(p))}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.ricerca}>
          <span className={styles.tipoLbl}>Cerca</span>
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="verbale o parte d’opera"
          />
        </label>
        <span id={`${ricercaId}-hint`} className={styles.hint}>
          Solo stesso mix, non già assegnati, per vicinanza temporale.
          {compatibili.length > CAP_MENU ? ` Mostrati ${CAP_MENU} di ${compatibili.length}.` : ''}
        </span>
      </div>

      {/* INCOMPLETO (controllo aperto): nessun verdetto, guardrail. */}
      {!vuoto && !completo && (
        <p className={styles.aperto} role="status">
          <strong>Controllo aperto.</strong> Servono ancora {mancanti} preliev
          {mancanti === 1 ? 'o' : 'i'} ({mancanti * 2} cubetti) dello stesso mix per chiuderlo (Tipo
          A = 3 prelievi = 6 cubetti).
        </p>
      )}

      {/* COMPLETO: risultato NTC + esito. */}
      {!vuoto && completo && (
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

          {!omog.omogenea && (
            <p className={styles.alertForte} role="alert">
              <span aria-hidden="true">⚠</span> {omog.messaggio}
            </p>
          )}
          {avvisi.length > 0 && (
            <ul className={styles.avvisi} aria-label="Avvisi del controllo">
              {avvisi.map((a) => (
                <li key={a}>⚠ {a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Azione di salvataggio + FEEDBACK (fix P1: niente pulsante "frizzato"). */}
      {!vuoto && (
        <div className={styles.azioni}>
          {salvato ? (
            <span className={styles.salvato} role="status">
              ✓ Salvato
            </span>
          ) : (
            <button
              type="button"
              className={
                !completo ? styles.salvaAperto : richiedeForza ? styles.forza : styles.salva
              }
              onClick={() => void handleSalva()}
            >
              {!completo
                ? 'Salva controllo aperto'
                : richiedeForza
                  ? 'Forza e salva'
                  : 'Salva controllo'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
