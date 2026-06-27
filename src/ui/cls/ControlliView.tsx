import { useEffect, useMemo, useState } from 'react';
import type {
  ControlloSalvato,
  ModoRaggruppamento,
  Prelievo,
  TipoControllo,
} from '../../core/index.ts';
import { raggruppa, refertato, calcolaControllo } from '../../domain/index.ts';
import { caricaTuttiControlli, salvaControllo, eliminaControllo } from '../../io/controlli.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { useStore } from '../../stato/store.ts';
import { GruppoControllo } from './GruppoControllo.tsx';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import styles from './ControlliView.module.css';

interface GruppoState {
  id: string;
  prelieviIds: string[];
  tipo?: TipoControllo;
}

const STRATEGIE: { modo: ModoRaggruppamento; nome: string; desc: string }[] = [
  {
    modo: 'auto',
    nome: 'A · Auto-posizionale',
    desc: 'Terzine consecutive nell’ordine del registro (metodo Excel).',
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
  const [modo, setModo] = useState<ModoRaggruppamento | ''>('');
  const [gruppi, setGruppi] = useState<GruppoState[]>([]);
  const [salvati, setSalvati] = useState<ControlloSalvato[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let on = true;
    void caricaTuttiControlli()
      .then((c) => on && setSalvati(c))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  const byId = useMemo(() => new Map(prelievi.map((p) => [p.id, p])), [prelievi]);
  const refert = useMemo(() => prelievi.filter(refertato), [prelievi]);

  function genera(m: ModoRaggruppamento) {
    setModo(m);
    setMsg('');
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

  async function salva(g: GruppoState, forzato: boolean) {
    const pr = risolvi(g.prelieviIds);
    if (pr.length === 0) return;
    const esito = g.tipo
      ? calcolaControllo(pr, { soglie, tipo: g.tipo, forzato })
      : calcolaControllo(pr, { soglie, forzato });
    const r = esito.risultato;
    const c: ControlloSalvato = {
      id: uid(),
      wbs: pr[0]?.wbs ?? '',
      tipo: r.tipo,
      rck: r.rck,
      prelieviIds: g.prelieviIds,
      esito: r.conforme ? 'conforme' : 'non_conforme',
      forzato,
      generato: new Date().toISOString(),
    };
    if (pr[0]?.mix) c.mix = pr[0].mix;
    if (r.rckEffettiva != null) c.rckEffettiva = r.rckEffettiva;
    await salvaControllo(c);
    setSalvati(await caricaTuttiControlli());
    setMsg(`Controllo ${r.tipo} salvato (${c.esito}${forzato ? ', forzato' : ''}).`);
  }

  async function elimina(id: string) {
    await eliminaControllo(id);
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
      <h2 id="ctr-titolo" className={styles.titolo}>
        Controlli di accettazione
      </h2>
      <p className={styles.intro}>
        {refert.length} prelievi refertati disponibili. La strategia <strong>propone</strong> i
        gruppi; tu li
        <strong> rivedi</strong> e confermi. Nessun verdetto è automatico.
      </p>

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

      <p className={styles.stato} role="status" aria-live="polite">
        {msg}
      </p>

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
          disponibili={refert.filter((p) => !g.prelieviIds.includes(p.id))}
          soglie={soglie}
          tipoForzato={g.tipo}
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
          onSalva={(forzato) => void salva(g, forzato)}
        />
      ))}

      {salvati.length > 0 && (
        <section className={styles.salvati} aria-labelledby="salv-titolo">
          <h3 id="salv-titolo" className={styles.salvTitolo}>
            Controlli salvati ({salvati.length})
          </h3>
          <ul className={styles.salvLista}>
            {salvati.map((c) => (
              <li key={c.id} className={styles.salvItem}>
                <EsitoBadge conforme={c.esito === 'conforme'} forzato={c.forzato} />
                <span className={styles.salvInfo}>
                  Tipo {c.tipo} · Rck {formattaNumeroIt(c.rck)} ·{' '}
                  {c.rckEffettiva != null
                    ? `Rck eff ${formattaNumeroIt(c.rckEffettiva, 2)} · `
                    : ''}
                  {c.prelieviIds.length} prelievi · {c.wbs}
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
