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
  descriviPrelievo,
} from '../../domain/index.ts';
import type { PresenzaWbs } from '../../io/documenti.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import { ScrollOrizzontale } from '../comuni/ScrollOrizzontale.tsx';
import { LinkDocumento } from './LinkDocumento.tsx';
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
  /** OPERA specifica del controllo (testo libero), salvata sul ControlloSalvato. */
  opera?: string;
  /** presenza documenti per WBS (per il semaforo dei link ereditati dal registro). */
  presenze?: Map<string, PresenzaWbs>;
  /** ANTEPRIMA: sola lettura (schede di export) — niente Togli/Aggiungi/Salva/Opera-edit. */
  readOnly?: boolean;
  /** WBS da mostrare nel titolo "Controllo N — WBS XX" (SOLO a schermo, fuori dall'export). */
  etichettaWbs?: string;
  onSetOpera?: (opera: string) => void;
  onRimuovi?: (id: string) => void;
  onAggiungi?: (id: string) => void;
  onSetTipo?: (t: TipoControllo | undefined) => void;
  onElimina?: () => void;
  onSalva?: () => Promise<void> | void;
}

const fmt = (x: number | undefined): string => formattaNumeroIt(x, 2);
const CAP_MENU = 100;

export function GruppoControllo(props: Props) {
  const { indice, prelievi, refertati, assegnati, soglie, tipoForzato } = props;
  const readOnly = props.readOnly ?? false;
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
  const pres = (wbs: string) => props.presenze?.get(wbs) ?? null;

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
    await props.onSalva?.();
    setSalvato(true);
  }

  const mancanti = Math.max(0, soglie.cls.nPrelieviTipoAMin - r.n);

  // Resistenza minima del gruppo: serve a evidenziare il prelievo che "tiene
  // basso" un controllo non conforme (l'elemento vincolante, già calcolato).
  const resistenze = prelievi
    .map((p) => resistenzaPrelievo(p))
    .filter((x): x is number => x != null);
  const rcMin = resistenze.length ? Math.min(...resistenze) : null;

  // Celle Rmin/Rm/Rck eff UNITE sulla terzina (rowSpan), come le merge M/N/O
  // dell'ST36: i valori del controllo (dal calcolo esistente, engine intatto)
  // appaiono una sola volta per gruppo, allineati ai suoi prelievi.
  const n = prelievi.length;
  const controlloCelle = completo ? (
    r.tipo === 'A' ? (
      <>
        <td rowSpan={n} className={`${styles.num} ${styles.ctrl}`}>
          {fmt(r.rcmin)}
        </td>
        <td rowSpan={n} className={`${styles.num} ${styles.ctrl}`}>
          {fmt(r.rcm28)}
        </td>
        <td rowSpan={n} className={`${styles.num} ${styles.ctrl} ${styles.evidenza}`}>
          {fmt(r.rckEffettiva)}
        </td>
      </>
    ) : (
      <td colSpan={3} rowSpan={n} className={`${styles.ctrl} ${styles.ctrlB}`}>
        Tipo B · s {fmt(r.s)} · CV {formattaNumeroIt(r.cv, 3)} · R<sub>m</sub> {fmt(r.rcm28)} · R
        <sub>min</sub> {fmt(r.rcmin)}
      </td>
    )
  ) : (
    <td colSpan={3} rowSpan={n} className={`${styles.ctrl} ${styles.ctrlAperto}`}>
      Controllo aperto — {mancanti} preliev{mancanti === 1 ? 'o' : 'i'} al minimo
    </td>
  );

  // Accento CONFORMITÀ della card (linguaggio diverso dai colori-DOCUMENTO sui
  // numeri-link): verde=conforme, rosso=non conforme, neutro=aperto/incompleto.
  const accento = !completo ? '' : r.conforme ? styles.cardOk : styles.cardNo;

  return (
    <article className={`${styles.card} ${accento}`} aria-label={`Controllo ${indice}`}>
      <header className={styles.testa}>
        <h3 className={styles.titolo}>
          Controllo {indice}
          {props.etichettaWbs ? ` — WBS ${props.etichettaWbs}` : ''}
        </h3>
        {vuoto ? null : completo ? (
          <EsitoBadge conforme={r.conforme} />
        ) : (
          <EsitoBadge conforme={false} stato="incompleto" testo="Incompleto · aperto" />
        )}
        {!readOnly && (
          <button type="button" className={styles.elimina} onClick={props.onElimina}>
            Elimina gruppo
          </button>
        )}
      </header>

      {/* OPERA specifica del controllo (testo libero) — sotto l'intestazione
          cantiere; viene salvata sul ControlloSalvato (servirà al doc ST36 M6). */}
      {!vuoto &&
        (readOnly ? (
          props.opera ? (
            <p className={styles.operaRiga}>
              <span className={styles.operaLbl}>Opera</span>
              <span>{props.opera}</span>
            </p>
          ) : null
        ) : (
          <label className={styles.operaRiga}>
            <span className={styles.operaLbl}>Opera</span>
            <input
              type="text"
              className={styles.operaInput}
              value={props.opera ?? ''}
              placeholder="es. TOMBINO SCATOLARE TO59 - pk 7+624"
              onChange={(e) => props.onSetOpera?.(e.target.value)}
            />
          </label>
        ))}

      {/* Tipo suggerito + forzatura (solo per gruppi non vuoti). */}
      {!vuoto && (
        <div className={styles.tipoRiga}>
          <span className={styles.motivo}>
            <strong>Tipo {esito.tipoApplicato}</strong> · {esito.suggerimento.motivo}
          </span>
          {!readOnly && (
            <label className={styles.tipoSel}>
              <span className={styles.tipoLbl}>Tipo</span>
              <select
                value={tipoForzato ?? ''}
                onChange={(e) =>
                  props.onSetTipo?.(
                    e.target.value === '' ? undefined : (e.target.value as TipoControllo),
                  )
                }
              >
                <option value="">Suggerito ({esito.suggerimento.tipo})</option>
                <option value="A">Forza A</option>
                <option value="B">Forza B</option>
              </select>
            </label>
          )}
        </div>
      )}

      {/* Prelievi del gruppo (editabili) — layout ST36: stesse colonne e ordine,
          Rmin/Rm/Rck eff uniti per terzina. La GENERAZIONE del documento è M6. */}
      <ScrollOrizzontale className={styles.scrollTab}>
        <table className={styles.prelievi}>
          <caption className={styles.srOnly}>
            Controllo {indice} — prelievi e risultati (layout ST36)
          </caption>
          <thead>
            <tr className={styles.bande}>
              <th colSpan={3} scope="colgroup">
                Prelievo campione
              </th>
              <th scope="col">Parte di opera</th>
              <th scope="col">Laboratorio</th>
              <th colSpan={6} scope="colgroup">
                Risultati delle prove
              </th>
              <th colSpan={3} scope="colgroup">
                Controllo «Tipo {r.tipo}»
              </th>
              {!readOnly && <th aria-hidden="true" />}
            </tr>
            <tr>
              <th scope="col" className={styles.fissaCol}>
                Data
              </th>
              <th scope="col" className={styles.num}>
                Rck
              </th>
              <th scope="col">Verbale</th>
              <th scope="col">Parte d'opera</th>
              <th scope="col">Laboratorio</th>
              <th scope="col">Certificato</th>
              <th scope="col">Data prova</th>
              <th scope="col" className={styles.num}>
                Rott. a gg.
              </th>
              <th scope="col" className={styles.num}>
                R1
              </th>
              <th scope="col" className={styles.num}>
                R2
              </th>
              <th scope="col" className={styles.num}>
                R
              </th>
              <th scope="col" className={styles.num}>
                R<sub>min</sub>
              </th>
              <th scope="col" className={styles.num}>
                R<sub>m</sub>
              </th>
              <th scope="col" className={styles.num}>
                R<sub>ck</sub> eff.
              </th>
              {!readOnly && <th scope="col" />}
            </tr>
          </thead>
          <tbody>
            {prelievi.map((p, i) => {
              const vp = descriviPrelievo(p, soglie);
              const rc = resistenzaPrelievo(p);
              // ELEMENTO PROBLEMATICO (semaforo CONFORMITÀ, non documento):
              // prelievo nullo (scarto R1/R2 > soglia), R nettamente sotto Rck,
              // o il prelievo con R minima quando il controllo è non conforme.
              const nullo = vp.validita?.valido === false;
              const problematico =
                nullo ||
                vp.preliminare?.stato === 'fuori_soglia' ||
                (completo && !r.conforme && rc != null && rc === rcMin);
              const motivo = nullo
                ? `Prelievo nullo: scarto R1/R2 ${vp.validita?.scartoPct}% oltre soglia.`
                : vp.preliminare?.stato === 'fuori_soglia'
                  ? (vp.preliminare.note[0] ?? 'Resistenza fuori soglia.')
                  : 'Resistenza minima del controllo.';
              return (
                <tr key={p.id} className={problematico ? styles.rigaProblema : undefined}>
                  <td className={styles.fissaCol}>{p.data}</td>
                  <td className={styles.num}>{fmt(p.rck)}</td>
                  <th scope="row" className={styles.code}>
                    <LinkDocumento
                      prelievo={p}
                      tipo="verbale"
                      campo="verbaleFile"
                      valore={p.verbale}
                      presenza={pres(p.wbs)}
                    />
                  </th>
                  <td className={styles.parte}>{p.parte}</td>
                  <td>{p.laboratorio ?? '—'}</td>
                  <td className={styles.code}>
                    <LinkDocumento
                      prelievo={p}
                      tipo="certificato"
                      campo="certificatoFile"
                      valore={p.certificato}
                      presenza={pres(p.wbs)}
                    />
                  </td>
                  <td>{p.dataProva ?? '—'}</td>
                  <td className={styles.num}>{vp.stagionaturaGg ?? '—'}</td>
                  <td className={styles.num}>{fmt(p.r1)}</td>
                  <td className={styles.num}>{fmt(p.r2)}</td>
                  <td className={styles.num}>
                    {fmt(rc)}
                    {problematico ? (
                      <span className={styles.flag} title={motivo}>
                        {' '}
                        ⚠<span className={styles.srOnly}> {motivo}</span>
                      </span>
                    ) : null}
                  </td>
                  {i === 0 && controlloCelle}
                  {!readOnly && (
                    <td className={styles.num}>
                      <button
                        type="button"
                        className={styles.togli}
                        onClick={() => props.onRimuovi?.(p.id)}
                        aria-label={`Togli ${p.verbale} dal controllo ${indice}`}
                      >
                        Togli
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {vuoto && (
              <tr>
                <td colSpan={15} className={styles.vuoto}>
                  Nessun prelievo. Aggiungine dal menu sotto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollOrizzontale>

      {/* Menu AGGIUNGI: solo prelievi compatibili + ricerca (scala). */}
      {!readOnly && (
        <div className={styles.aggiungiBox}>
          <label className={styles.aggiungi}>
            <span className={styles.tipoLbl}>
              Aggiungi prelievo {mixGruppo ? `(mix ${mixGruppo})` : ''}
            </span>
            <select
              value=""
              aria-describedby={`${ricercaId}-hint`}
              onChange={(e) => {
                if (e.target.value) props.onAggiungi?.(e.target.value);
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
      )}

      {/* INCOMPLETO (controllo aperto): nessun verdetto, guardrail. */}
      {!vuoto && !completo && (
        <p className={styles.aperto} role="status">
          <strong>Controllo aperto.</strong> Servono ancora {mancanti} preliev
          {mancanti === 1 ? 'o' : 'i'} ({mancanti * 2} cubetti) dello stesso mix per chiuderlo (Tipo
          A = 3 prelievi = 6 cubetti).
        </p>
      )}

      {/* COMPLETO: verifica NTC (i numeri Rmin/Rm/Rck eff sono in tabella). */}
      {!vuoto && completo && (
        <div className={styles.risultato}>
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
      {!vuoto && !readOnly && (
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
