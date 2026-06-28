import { useEffect, useMemo, useState } from 'react';
import type { ControlloSalvato, Prelievo, SchedaExport } from '../../core/index.ts';
import {
  controlliCompleti,
  raggruppaInSchede,
  schedeStale,
  spostaControllo,
  validaSchede,
} from '../../domain/index.ts';
import { caricaTuttiControlli } from '../../io/controlli.ts';
import { caricaSchede, salvaSchede } from '../../io/schede.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { useStore } from '../../stato/store.ts';
import { GruppoControllo } from './GruppoControllo.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import styles from './SchedeView.module.css';

/**
 * Vista a SCHEDE da 6 (pre-export ST36): raggruppa i controlli COMPLETI in fogli
 * da ≤6, anteprima read-only (riuso GruppoControllo), spostamento manuale coi
 * vincoli di dominio, tracciamento "da esportare / esportata / da riesportare".
 * L'export .docx è il passo successivo.
 */
export function SchedeView() {
  const prelievi = useStore((s) => s.prelievi);
  const soglie = useStore((s) => s.soglie);
  const revisioneDati = useStore((s) => s.revisioneDati);
  const segnaSporco = useStore((s) => s.segnaSporco);

  const [controlli, setControlli] = useState<ControlloSalvato[]>([]);
  const [schede, setSchede] = useState<SchedaExport[]>([]);
  const [messaggio, setMessaggio] = useState('');

  useEffect(() => {
    let on = true;
    void Promise.all([caricaTuttiControlli(), caricaSchede()])
      .then(([c, s]) => {
        if (!on) return;
        setControlli(c);
        setSchede(s);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [revisioneDati]);

  const completi = useMemo(() => controlliCompleti(controlli), [controlli]);
  const ctrlById = useMemo(() => new Map(controlli.map((c) => [c.id, c])), [controlli]);
  const prelById = useMemo(() => new Map(prelievi.map((p) => [p.id, p])), [prelievi]);
  const completiIds = useMemo(() => new Set(completi.map((c) => c.id)), [completi]);
  const problemi = useMemo(() => validaSchede(completi, schede), [completi, schede]);
  const staleIds = useMemo(
    () => new Set(schedeStale(schede, completiIds).map((s) => s.id)),
    [schede, completiIds],
  );

  async function persisti(next: SchedaExport[]) {
    setSchede(next);
    await salvaSchede(next);
    segnaSporco();
  }

  async function ricalcola() {
    const next = raggruppaInSchede(completi);
    await persisti(next);
    setMessaggio(`Ricalcolate ${next.length} schede automatiche (per opera, max 6).`);
  }

  async function sposta(controlloId: string, destId: string) {
    const esito = spostaControllo(schede, controlloId, destId);
    if (esito.errore) {
      setMessaggio(esito.errore);
      return;
    }
    await persisti(esito.schede);
    setMessaggio('');
  }

  if (completi.length === 0) {
    return (
      <p className={styles.vuoto}>
        Nessun controllo completo da impaginare. Genera e salva controlli completi (scheda
        «Controlli di accettazione»), poi torna qui.
      </p>
    );
  }

  return (
    <section aria-labelledby="sch-titolo">
      <div className={styles.testa}>
        <h2 id="sch-titolo" className={styles.titolo}>
          Schede di export ST36
        </h2>
        <button type="button" className={styles.ricalcola} onClick={() => void ricalcola()}>
          {schede.length === 0 ? 'Genera schede automatiche' : 'Ricalcola schede automatiche'}
        </button>
      </div>
      <p className={styles.intro}>
        Ogni scheda contiene <strong>max 6 controlli completi</strong> (= 6 terzine ST36). Sposta i
        controlli tra le schede; ognuno finisce in <strong>una sola</strong> scheda. L'export del
        documento è il passo successivo.
      </p>

      {!problemi.ok && (
        <p className={styles.problemi} role="alert">
          {problemi.dimenticati.length > 0 &&
            `${problemi.dimenticati.length} controlli completi non sono in nessuna scheda. `}
          {problemi.doppioni.length > 0 && `${problemi.doppioni.length} controlli in due schede. `}
          {problemi.orfani.length > 0 &&
            `${problemi.orfani.length} riferimenti a controlli non più esistenti. `}
          Premi «Ricalcola schede automatiche» per sistemare.
        </p>
      )}
      {messaggio && (
        <p className={styles.stato} role="status" aria-live="polite">
          {messaggio}
        </p>
      )}

      {schede.length === 0 && (
        <p className={styles.vuoto}>
          Nessuna scheda. Premi «Genera schede automatiche» per impaginare i {completi.length}{' '}
          controlli completi.
        </p>
      )}

      {schede.map((sch) => {
        const stale = staleIds.has(sch.id);
        const stato = stale
          ? { txt: 'DA RIESPORTARE', cls: styles.bdgStale }
          : sch.esportato
            ? { txt: `Esportata il ${sch.esportatoIl ?? '—'}`, cls: styles.bdgOk }
            : { txt: 'Da esportare', cls: styles.bdgTodo };
        const altre = schede.filter((x) => x.id !== sch.id);
        return (
          <article key={sch.id} className={styles.scheda} aria-label={`Scheda ${sch.numero}`}>
            <header className={styles.schTesta}>
              <h3 className={styles.schTitolo}>
                Scheda {sch.numero}
                {sch.wbs ? ` · ${sch.wbs}` : ''} · {sch.controlliIds.length}/6
              </h3>
              <span className={`${styles.badge} ${stato.cls}`}>{stato.txt}</span>
            </header>

            <IntestazioneCantiere />

            {sch.controlliIds.map((cid, i) => {
              const ctrl = ctrlById.get(cid);
              const move = (
                <label className={styles.sposta}>
                  <span className={styles.spostaLbl}>Sposta in</span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) void sposta(cid, e.target.value);
                    }}
                  >
                    <option value="">— scheda —</option>
                    {altre.map((x) => (
                      <option key={x.id} value={x.id}>
                        Scheda {x.numero} ({x.controlliIds.length}/6)
                      </option>
                    ))}
                  </select>
                </label>
              );

              if (!ctrl) {
                return (
                  <div key={cid} className={styles.degrado}>
                    ⚠ Controllo non più disponibile (modificato o eliminato) → scheda da
                    riesportare.
                    {move}
                  </div>
                );
              }
              const pr = ctrl.prelieviIds
                .map((id) => prelById.get(id))
                .filter((p): p is Prelievo => p != null);
              const completo = pr.length === ctrl.prelieviIds.length;
              return (
                <div key={cid} className={styles.controlloBox}>
                  {completo ? (
                    <GruppoControllo
                      readOnly
                      indice={i + 1}
                      etichettaWbs={ctrl.wbs}
                      prelievi={pr}
                      refertati={[]}
                      assegnati={new Set()}
                      soglie={soglie}
                      tipoForzato={ctrl.tipo}
                      opera={ctrl.opera ?? ''}
                    />
                  ) : (
                    <div className={styles.degrado}>
                      <strong>
                        Controllo Tipo {ctrl.tipo} · Rck {formattaNumeroIt(ctrl.rck)} · {ctrl.n}{' '}
                        prelievi · {ctrl.wbs}
                      </strong>
                      <span className={styles.degradoNota}>
                        Carica la WBS «{ctrl.wbs}» (scheda Registro) per l'anteprima completa.
                      </span>
                    </div>
                  )}
                  {move}
                </div>
              );
            })}
          </article>
        );
      })}
    </section>
  );
}
