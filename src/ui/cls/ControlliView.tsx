import { useEffect, useMemo, useState } from 'react';
import type {
  ControlloSalvato,
  ModoRaggruppamento,
  Prelievo,
  TipoControllo,
} from '../../core/index.ts';
import {
  raggruppa,
  refertato,
  costruisciControlloSalvato,
  guardrailPerMix,
} from '../../domain/index.ts';
import {
  caricaTuttiControlli,
  salvaControllo,
  eliminaControllo,
  svuotaControlli,
} from '../../io/controlli.ts';
import { presenzaDocCls, type PresenzaWbs } from '../../io/documenti.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { useStore } from '../../stato/store.ts';
import { GruppoControllo } from './GruppoControllo.tsx';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import styles from './ControlliView.module.css';

interface GruppoState {
  id: string;
  prelieviIds: string[];
  tipo?: TipoControllo;
  /** OPERA specifica del controllo (testo libero), salvata sul ControlloSalvato. */
  opera?: string;
}

const STRATEGIE: { modo: ModoRaggruppamento; nome: string; desc: string }[] = [
  {
    modo: 'auto',
    nome: 'A · Auto-posizionale',
    desc: 'Terzine consecutive per mix, nell’ordine del registro.',
  },
  {
    modo: 'assistito',
    nome: 'B · Assistito-omogeneo',
    desc: 'Terzine per mix + parte d’opera + vicinanza temporale.',
  },
  { modo: 'manuale', nome: 'C · Manuale', desc: 'Selezione libera: parti da un gruppo vuoto.' },
];

function uid(): string {
  return crypto.randomUUID();
}

export function ControlliView() {
  const prelievi = useStore((s) => s.prelievi);
  const soglie = useStore((s) => s.soglie);
  const cartella = useStore((s) => s.cartella);
  const revisioneDati = useStore((s) => s.revisioneDati);
  const segnaSporco = useStore((s) => s.segnaSporco);
  const [modo, setModo] = useState<ModoRaggruppamento | ''>('');
  const [gruppi, setGruppi] = useState<GruppoState[]>([]);
  const [salvati, setSalvati] = useState<ControlloSalvato[]>([]);
  const [presenze, setPresenze] = useState<Map<string, PresenzaWbs>>(new Map());

  // ricarica i salvati al montaggio e quando la cache cambia (collegamento/
  // ricarica dalla cartella, invalidazione versione — M4).
  useEffect(() => {
    let on = true;
    void caricaTuttiControlli()
      .then((c) => on && setSalvati(c))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [revisioneDati]);

  // mappa di presenza documenti per WBS (semaforo dei link ereditati nelle schede).
  useEffect(() => {
    if (!cartella) {
      setPresenze(new Map());
      return;
    }
    let attivo = true;
    const wbsUniche = [...new Set(prelievi.map((p) => p.wbs).filter(Boolean))];
    void (async () => {
      const m = new Map<string, PresenzaWbs>();
      for (const w of wbsUniche) m.set(w, await presenzaDocCls(cartella, w));
      if (attivo) setPresenze(m);
    })();
    return () => {
      attivo = false;
    };
  }, [cartella, prelievi, revisioneDati]);

  const byId = useMemo(() => new Map(prelievi.map((p) => [p.id, p])), [prelievi]);
  const refert = useMemo(() => prelievi.filter(refertato), [prelievi]);
  const guardrail = useMemo(() => guardrailPerMix(prelievi, soglie), [prelievi, soglie]);

  // "no media mobile": un prelievo sta in UN solo controllo. Insieme di quelli
  // già impegnati (in un gruppo della proposta o in un controllo salvato).
  const assegnati = useMemo(() => {
    const s = new Set<string>();
    for (const g of gruppi) for (const id of g.prelieviIds) s.add(id);
    for (const c of salvati) for (const id of c.prelieviIds) s.add(id);
    return s;
  }, [gruppi, salvati]);

  function genera(m: ModoRaggruppamento) {
    setModo(m);
    if (m === 'manuale') {
      setGruppi([{ id: uid(), prelieviIds: [] }]);
      return;
    }
    setGruppi(
      raggruppa(prelievi, m, soglie).map((p) => ({ id: uid(), prelieviIds: p.prelieviIds })),
    );
  }

  const aggiorna = (id: string, fn: (g: GruppoState) => GruppoState) =>
    setGruppi((gs) => gs.map((g) => (g.id === id ? fn(g) : g)));

  const risolvi = (ids: string[]): Prelievo[] =>
    ids.map((id) => byId.get(id)).filter((p): p is Prelievo => p != null);

  // idempotente PER CONTENUTO: la chiave del controllo salvato deriva dai suoi
  // prelievi (non da un uid di sessione) → ri-salvare lo stesso insieme di
  // prelievi AGGIORNA la voce, anche dopo una rigenerazione o in altra sessione.
  async function salva(g: GruppoState) {
    const pr = risolvi(g.prelieviIds);
    if (pr.length === 0) return;
    const c = costruisciControlloSalvato(pr, {
      generato: new Date().toISOString(),
      soglie,
      ...(g.tipo ? { tipo: g.tipo } : {}),
      ...(g.opera?.trim() ? { opera: g.opera.trim() } : {}),
    });
    await salvaControllo(c);
    segnaSporco(); // modifica non ancora versata nel progetto
    setSalvati(await caricaTuttiControlli());
  }

  async function elimina(id: string) {
    await eliminaControllo(id);
    segnaSporco();
    setSalvati(await caricaTuttiControlli());
  }

  async function svuota() {
    if (
      !window.confirm(
        'Svuotare tutti i controlli salvati? I prelievi importati non vengono toccati.',
      )
    ) {
      return;
    }
    await svuotaControlli();
    segnaSporco();
    setSalvati(await caricaTuttiControlli());
  }

  if (prelievi.length === 0) {
    return (
      <p className={styles.vuoto}>
        Importa un registro (scheda «Registro») per creare i controlli.
      </p>
    );
  }

  return (
    <section aria-labelledby="ctr-titolo">
      <IntestazioneCantiere />
      <h2 id="ctr-titolo" className={styles.titolo}>
        Controlli di accettazione
      </h2>
      <p className={styles.intro}>
        {refert.length} prelievi refertati. La strategia <strong>propone</strong> i gruppi; tu li{' '}
        <strong>rivedi</strong> e confermi. Nessun verdetto è automatico.
      </p>

      <section className={styles.infoNorma} aria-labelledby="info-norma-titolo">
        <h3 id="info-norma-titolo" className={styles.infoNormaTitolo}>
          Controlli di accettazione — Calcestruzzo (NTC 2018 §11.2.5, Circolare 2019)
        </h3>
        <p>
          Il controllo è riferito a ciascuna «miscela omogenea»: ai fini dell’accettazione,
          calcestruzzo che — nell’ambito di una stessa ricetta di base — mantiene costanti i
          requisiti di classe di resistenza e classe di esposizione (sono ammesse lievi modifiche
          dei componenti per mantenere le prestazioni). In Kerios i prelievi sono quindi raggruppati
          per miscela omogenea.
        </p>
        <p>La norma prevede due criteri, non convergenti, da usare in modo alternativo:</p>
        <ul>
          <li>
            <strong>Tipo A (§11.2.5.1)</strong> — forfettario: ogni controllo è riferito a un
            massimo di 300 m³ di miscela omogenea ed è costituito da 3 prelievi (terzina). Esito
            positivo se R<sub>cm</sub> ≥ R<sub>ck</sub> + 3,5 e R<sub>c,min</sub> ≥ R<sub>ck</sub> −
            3,5.
          </li>
          <li>
            <strong>Tipo B (§11.2.5.2)</strong> — statistico: obbligatorio per più di 1500 m³ di
            miscela omogenea; costituito da almeno 15 prelievi. Esito positivo se R<sub>cm</sub> ≥ R
            <sub>ck</sub> + 1,48·s e R<sub>c,min</sub> ≥ R<sub>ck</sub> − 3,5 (s = scarto quadratico
            medio dei prelievi).
          </li>
        </ul>
        <p>
          Il tipo di controllo è scelto dall’operatore (Direttore dei Lavori); Kerios lo suggerisce
          in base a volume e numero di prelievi, ma la scelta resta libera.
        </p>
      </section>

      {guardrail.length > 0 && (
        <section className={styles.guardrail} aria-labelledby="gr-titolo">
          <h3 id="gr-titolo" className={styles.grTitolo}>
            Guardrail per mix — cosa manca per chiudere i controlli
          </h3>
          <ul className={styles.grLista}>
            {guardrail.map((g) => (
              <li key={g.mix} className={styles.grRiga}>
                <span className={styles.grMix}>{g.mix || '(senza mix)'}</span>
                <span className={styles.grDati}>
                  {g.nRefertati} prelievi → {g.terzineComplete} controll
                  {g.terzineComplete === 1 ? 'o' : 'i'} Tipo A completi
                  {g.restoAperto > 0
                    ? ` · 1 aperto: mancano ${g.prelieviMancanti} prelievi (${g.cubettiMancanti} cubetti)`
                    : ' · nessun controllo aperto'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.strategie} role="group" aria-label="Strategia di raggruppamento">
        {STRATEGIE.map((s) => (
          <button
            key={s.modo}
            type="button"
            className={`${styles.strategia} ${modo === s.modo ? styles.attiva : ''}`}
            aria-pressed={modo === s.modo}
            onClick={() => genera(s.modo)}
          >
            <span className={styles.strNome}>{s.nome}</span>
            <span className={styles.strDesc}>{s.desc}</span>
          </button>
        ))}
      </div>

      {modo === 'manuale' && (
        <button
          type="button"
          className={styles.nuovo}
          onClick={() => setGruppi((gs) => [...gs, { id: uid(), prelieviIds: [] }])}
        >
          + Nuovo gruppo
        </button>
      )}

      {gruppi.map((g, i) => (
        <GruppoControllo
          key={g.id}
          indice={i + 1}
          prelievi={risolvi(g.prelieviIds)}
          refertati={refert}
          assegnati={assegnati}
          soglie={soglie}
          tipoForzato={g.tipo}
          opera={g.opera ?? ''}
          presenze={presenze}
          onSetOpera={(opera) => aggiorna(g.id, (x) => ({ ...x, opera }))}
          onRimuovi={(id) =>
            aggiorna(g.id, (x) => ({ ...x, prelieviIds: x.prelieviIds.filter((y) => y !== id) }))
          }
          onAggiungi={(id) =>
            aggiorna(g.id, (x) => ({ ...x, prelieviIds: [...x.prelieviIds, id] }))
          }
          onSetTipo={(t) =>
            aggiorna(g.id, (x) => {
              const next: GruppoState = { id: x.id, prelieviIds: x.prelieviIds };
              if (t) next.tipo = t;
              return next;
            })
          }
          onElimina={() => setGruppi((gs) => gs.filter((x) => x.id !== g.id))}
          onSalva={() => salva(g)}
        />
      ))}

      {salvati.length > 0 && (
        <section className={styles.salvati} aria-labelledby="salv-titolo">
          <div className={styles.salvTesta}>
            <h3 id="salv-titolo" className={styles.salvTitolo}>
              Controlli salvati ({salvati.length})
            </h3>
            <button type="button" className={styles.svuota} onClick={() => void svuota()}>
              Svuota controlli salvati
            </button>
          </div>
          <ul className={styles.salvLista}>
            {salvati.map((c) => (
              <li key={c.id} className={styles.salvItem}>
                {c.esito === 'incompleto' ? (
                  <EsitoBadge
                    conforme={false}
                    forzato={c.forzato}
                    stato="incompleto"
                    testo="Incompleto"
                  />
                ) : (
                  <EsitoBadge conforme={c.esito === 'conforme'} forzato={c.forzato} />
                )}
                <span className={styles.salvInfo}>
                  Tipo {c.tipo} · Rck {formattaNumeroIt(c.rck)} ·{' '}
                  {c.rckEffettiva != null
                    ? `Rck eff ${formattaNumeroIt(c.rckEffettiva, 2)} · `
                    : ''}
                  {c.n ?? c.prelieviIds.length} prelievi · {c.wbs}
                </span>
                <button
                  type="button"
                  className={styles.salvElimina}
                  onClick={() => void elimina(c.id)}
                >
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
