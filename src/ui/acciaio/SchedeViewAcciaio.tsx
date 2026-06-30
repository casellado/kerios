import { useEffect, useMemo, useState } from 'react';
import type { PrelievoAcciaio, SchedaExportAcciaio } from '../../core/index.ts';
import { MAX_PRELIEVI_SCHEDA_ACCIAIO } from '../../core/index.ts';
import { esitiPrelievoAcciaio, raggruppaInSchedeAcciaio } from '../../domain/index.ts';
import { caricaSchedeAcciaio, salvaSchedeAcciaio } from '../../io/schedeAcciaio.ts';
import { mappaSchedaST36Acciaio } from '../../io/st36datiAcciaio.ts';
import { generaXlsxAcciaioST36, XLSX_MIME } from '../../io/xlsxAcciaioST36.ts';
import { apriFile, cartellaPercorso, copiaFileIn } from '../../io/workspace.ts';
import { useStore } from '../../stato/store.ts';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import styles from '../cls/SchedeView.module.css';
import lista from './SchedeAcciaio.module.css';

const MATERIALE_ACCIAIO = 'acciaio';
const MAX = MAX_PRELIEVI_SCHEDA_ACCIAIO;

// nome file = OPERA del primo prelievo (sanificata), fallback prevedibile. Come il cls.
const nomeFileScheda = (opera: string | undefined, wbs: string, numero: number): string => {
  const pulita = (opera ?? '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = pulita || `Controllo_accettazione_acciaio_${wbs}_scheda${numero}`;
  return `${base}.xlsx`;
};

/** Esito di un parametro → badge (Positivo/Negativo/incompleto-neutro). */
function Badge({ esito }: { esito: ReturnType<typeof esitiPrelievoAcciaio>['fy'] }) {
  if (esito === 'incompleto') return <EsitoBadge conforme={false} stato="incompleto" testo="—" />;
  return <EsitoBadge conforme={esito === 'Positivo'} testo={esito} />;
}

export function SchedeViewAcciaio() {
  const prelievi = useStore((s) => s.prelieviAcciaio);
  const cartella = useStore((s) => s.cartella);
  const intestazione = useStore((s) => s.intestazione);
  const revisioneDati = useStore((s) => s.revisioneDati);
  const segnaSporco = useStore((s) => s.segnaSporco);

  const [schede, setSchede] = useState<SchedaExportAcciaio[]>([]);
  const [messaggio, setMessaggio] = useState('');
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());

  useEffect(() => {
    let on = true;
    void caricaSchedeAcciaio()
      .then((s) => {
        if (!on) return;
        setSchede(s);
        setSelezionati(new Set(s.flatMap((x) => x.prelieviIds)));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [revisioneDati]);

  const prelById = useMemo(() => new Map(prelievi.map((p) => [p.id, p])), [prelievi]);

  async function persisti(next: SchedaExportAcciaio[]) {
    setSchede(next);
    await salvaSchedeAcciaio(next);
    segnaSporco();
  }

  async function ricalcola() {
    const next = raggruppaInSchedeAcciaio(prelievi);
    await persisti(next);
    setSelezionati(new Set(next.flatMap((x) => x.prelieviIds)));
    setMessaggio(`Ricalcolate ${next.length} schede automatiche (per WBS, max ${MAX} prelievi).`);
  }

  const flagga = (pid: string, on: boolean) =>
    setSelezionati((prev) => {
      const next = new Set(prev);
      if (on) next.add(pid);
      else next.delete(pid);
      return next;
    });

  /** Prelievi FLAGGATI di una scheda, presenti nel working set; null + messaggio se mancano. */
  function risolviSelezione(sch: SchedaExportAcciaio): PrelievoAcciaio[] | null {
    const scelti = sch.prelieviIds.filter((pid) => selezionati.has(pid));
    if (scelti.length === 0) {
      setMessaggio(`Scheda ${sch.numero}: seleziona almeno un prelievo da esportare.`);
      return null;
    }
    const out: PrelievoAcciaio[] = [];
    for (const pid of scelti) {
      const p = prelById.get(pid);
      if (!p) {
        setMessaggio(
          `Carica il registro acciaio della WBS «${sch.wbs ?? ''}» per esportare la scheda ${sch.numero}.`,
        );
        return null;
      }
      out.push(p);
    }
    return out;
  }

  async function esporta(sch: SchedaExportAcciaio) {
    if (!cartella) {
      setMessaggio('Collega una cartella di lavoro per esportare il documento.');
      return;
    }
    const scelti = risolviSelezione(sch);
    if (!scelti) return;
    const wbs = sch.wbs ?? scelti[0]?.wbs ?? 'WBS';
    const nome = nomeFileScheda(scelti[0]?.opera, wbs, sch.numero);
    try {
      const blob = await generaXlsxAcciaioST36({
        intestazione,
        numeroScheda: sch.numero,
        documento: mappaSchedaST36Acciaio(scelti),
      });
      const dir = await cartellaPercorso(cartella, [MATERIALE_ACCIAIO, wbs, 'pdf'], {
        create: true,
      });
      if (dir) await copiaFileIn(dir, new File([blob], nome, { type: XLSX_MIME }), nome);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      const next = schede.map((s) =>
        s.id === sch.id
          ? { ...s, esportato: true, esportatoIl: new Date().toISOString(), fileXlsx: nome }
          : s,
      );
      await persisti(next);
      setMessaggio(
        `Esportata: ${nome} (salvata in acciaio/${wbs}/pdf/ e scaricata). Aprila in Excel e rifinisci.`,
      );
    } catch (e) {
      setMessaggio(`Errore di export: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function apriDocumento(sch: SchedaExportAcciaio) {
    if (!cartella || !sch.fileXlsx) return;
    const wbs = sch.wbs ?? 'WBS';
    const dir = await cartellaPercorso(cartella, [MATERIALE_ACCIAIO, wbs, 'pdf']);
    if (!dir) {
      setMessaggio('Cartella documenti non trovata: ri-esporta la scheda.');
      return;
    }
    const nomePdf = sch.fileXlsx.replace(/\.xlsx$/i, '.pdf');
    const file = (await apriFile(dir, nomePdf)) ?? (await apriFile(dir, sch.fileXlsx));
    if (!file) {
      setMessaggio('Documento non trovato nella cartella: ri-esporta la scheda.');
      return;
    }
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  if (prelievi.length === 0) {
    return (
      <p className={styles.vuoto}>
        Nessun prelievo acciaio caricato. Importa un registro AC1 (scheda «Registro»), poi torna
        qui.
      </p>
    );
  }

  return (
    <section aria-labelledby="sch-acc-titolo">
      <div className={styles.testa}>
        <h2 id="sch-acc-titolo" className={styles.titolo}>
          Schede di export ST36 acciaio
        </h2>
        <button type="button" className={styles.ricalcola} onClick={() => void ricalcola()}>
          {schede.length === 0 ? 'Genera schede automatiche' : 'Ricalcola schede automatiche'}
        </button>
      </div>
      <p className={styles.intro}>
        Ogni scheda contiene <strong>max {MAX} prelievi</strong> (righe R7..R24 dell’ST36 acciaio),
        accorpati per <strong>WBS</strong>; ogni riga è un campione di 3 saggi (omogeneo per Ø e
        produttore), ordinati per Ø e produttore dentro la scheda. Flagga i prelievi da stampare,
        poi «Esporta selezionati (.xlsx)»: genera il documento ST36 acciaio col template (aprilo in
        Excel, rifinisci, esporta il PDF).
      </p>
      {messaggio && (
        <p className={styles.stato} role="status" aria-live="polite">
          {messaggio}
        </p>
      )}

      {schede.length === 0 && (
        <p className={styles.vuoto}>
          Nessuna scheda. Premi «Genera schede automatiche» per impaginare i prelievi completi.
        </p>
      )}

      {schede.map((sch) => {
        const dataIt = sch.esportatoIl
          ? new Date(sch.esportatoIl).toLocaleDateString('it-IT')
          : '—';
        const stato = sch.esportato
          ? { txt: `Esportata il ${dataIt}`, cls: styles.bdgOk }
          : { txt: 'Da esportare', cls: styles.bdgTodo };
        const flaggati = sch.prelieviIds.filter((p) => selezionati.has(p)).length;
        return (
          <article key={sch.id} className={styles.scheda} aria-label={`Scheda ${sch.numero}`}>
            <header className={styles.schTesta}>
              <h3 className={styles.schTitolo}>
                Scheda {sch.numero}
                {sch.wbs ? ` · ${sch.wbs}` : ''} · {sch.prelieviIds.length}/{MAX}
              </h3>
              <span className={styles.schAzioni}>
                <span className={`${styles.badge} ${stato.cls}`}>{stato.txt}</span>
                <button type="button" className={styles.esporta} onClick={() => void esporta(sch)}>
                  {sch.esportato ? 'Ri-esporta selezionati (.xlsx)' : 'Esporta selezionati (.xlsx)'}
                </button>
                {sch.fileXlsx && (
                  <button
                    type="button"
                    className={styles.apri}
                    onClick={() => void apriDocumento(sch)}
                  >
                    Apri documento
                  </button>
                )}
              </span>
            </header>

            <IntestazioneCantiere />

            <ul className={lista.listaPrelievi}>
              {sch.prelieviIds.map((pid) => {
                const p = prelById.get(pid);
                if (!p) {
                  return (
                    <li key={pid} className={styles.degrado}>
                      ⚠ Prelievo non più disponibile (registro non caricato) → carica la WBS.
                    </li>
                  );
                }
                const e = esitiPrelievoAcciaio(p);
                const flag = selezionati.has(pid);
                const flagDisabilitato = !flag && flaggati >= MAX;
                return (
                  <li key={pid} className={lista.prelievoRiga}>
                    <label
                      className={styles.flag}
                      title={flagDisabilitato ? `Massimo ${MAX} prelievi per scheda` : ''}
                    >
                      <input
                        type="checkbox"
                        checked={flag}
                        disabled={flagDisabilitato}
                        onChange={(ev) => flagga(pid, ev.target.checked)}
                      />
                      <span className={lista.prelievoCod}>
                        {p.verbale} · Ø{Number.isFinite(p.diametro) ? p.diametro : '—'} ·{' '}
                        {p.produttore || '—'}
                      </span>
                    </label>
                    <span className={lista.esitiRiga}>
                      <Badge esito={e.fy} />
                      <Badge esito={e.agt} />
                      <Badge esito={e.ftfy} />
                      <Badge esito={e.piega} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
