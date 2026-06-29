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
import { mappaControlloST36, type ControlloPerDoc } from '../../io/st36dati.ts';
import { generaXlsxST36, XLSX_MIME } from '../../io/xlsxST36.ts';
import { apriFile, cartellaPercorso, copiaFileIn } from '../../io/workspace.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { useStore } from '../../stato/store.ts';
import { GruppoControllo } from './GruppoControllo.tsx';
import { IntestazioneCantiere } from '../comuni/IntestazioneCantiere.tsx';
import styles from './SchedeView.module.css';

const MATERIALE_CLS = 'calcestruzzo';
// Il PO vuole il file col nome dell'OPERA del controllo. Sanifico solo i caratteri
// illegali nei nomi file (/ \ : * ? " < > |) e gli spazi ai bordi; gli spazi interni
// restano (validi). Fallback prevedibile se l'opera non è compilata.
const nomeFileScheda = (opera: string | undefined, wbs: string, numero: number) => {
  const pulita = (opera ?? '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = pulita || `Controllo_accettazione_${wbs}_scheda${numero}`;
  return `${base}.xlsx`;
};

/**
 * Vista a SCHEDE da 6 (pre-export ST36): raggruppa i controlli COMPLETI in fogli
 * da ≤6, anteprima read-only (riuso GruppoControllo), spostamento manuale coi
 * vincoli di dominio, tracciamento "da esportare / esportata / da riesportare".
 * SELEZIONE FLAG (≤6) → export ST36 in .xlsx (exceljs, import dinamico — code-split).
 */
export function SchedeView() {
  const prelievi = useStore((s) => s.prelievi);
  const soglie = useStore((s) => s.soglie);
  const intestazione = useStore((s) => s.intestazione);
  const cartella = useStore((s) => s.cartella);
  const revisioneDati = useStore((s) => s.revisioneDati);
  const segnaSporco = useStore((s) => s.segnaSporco);

  const [controlli, setControlli] = useState<ControlloSalvato[]>([]);
  const [schede, setSchede] = useState<SchedaExport[]>([]);
  const [messaggio, setMessaggio] = useState('');
  // SELEZIONE FLAG: i controlli che andranno nell'.xlsx (max 6 per scheda).
  // Pre-flaggati = tutti quelli proposti dall'automatico; l'utente cambia.
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());

  useEffect(() => {
    let on = true;
    void Promise.all([caricaTuttiControlli(), caricaSchede()])
      .then(([c, s]) => {
        if (!on) return;
        setControlli(c);
        setSchede(s);
        // pre-flag: tutti i controlli già in scheda (proposta dell'automatico)
        setSelezionati(new Set(s.flatMap((x) => x.controlliIds)));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [revisioneDati]);

  const flagga = (cid: string, on: boolean) =>
    setSelezionati((prev) => {
      const next = new Set(prev);
      if (on) next.add(cid);
      else next.delete(cid);
      return next;
    });

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

  /** Risolve i controlli FLAGGATI di una scheda + prelievi; null + messaggio se mancano dati. */
  function risolviSelezione(sch: SchedaExport): ControlloPerDoc[] | null {
    const scelti = sch.controlliIds.filter((cid) => selezionati.has(cid));
    if (scelti.length === 0) {
      setMessaggio(`Scheda ${sch.numero}: seleziona almeno un controllo da esportare.`);
      return null;
    }
    const out: ControlloPerDoc[] = [];
    for (const cid of scelti) {
      const ctrl = ctrlById.get(cid);
      if (!ctrl) {
        setMessaggio(`Scheda ${sch.numero}: un controllo non è più disponibile → ricalcola.`);
        return null;
      }
      const pr = ctrl.prelieviIds
        .map((id) => prelById.get(id))
        .filter((p): p is Prelievo => p != null);
      if (pr.length !== ctrl.prelieviIds.length) {
        setMessaggio(
          `Carica la WBS «${ctrl.wbs}» dal Registro per esportare la scheda ${sch.numero}.`,
        );
        return null;
      }
      out.push({ ctrl, prelievi: pr });
    }
    return out;
  }

  async function esporta(sch: SchedaExport) {
    if (!cartella) {
      setMessaggio('Collega una cartella di lavoro per esportare il documento.');
      return;
    }
    const perDoc = risolviSelezione(sch);
    if (!perDoc) return; // messaggio già impostato (niente flag / WBS non caricata / mancante)
    const wbs = sch.wbs ?? perDoc[0]?.ctrl.wbs ?? 'WBS';
    // nome = opera del PRIMO controllo della scheda (di norma una scheda = un'opera)
    const nome = nomeFileScheda(perDoc[0]?.ctrl.opera, wbs, sch.numero);
    try {
      const blob = await generaXlsxST36({
        intestazione,
        numeroScheda: sch.numero,
        controlli: perDoc.map((cd) => mappaControlloST36(cd, soglie)),
      });
      // salva in <materiale>/<WBS>/pdf/ (accanto al PDF stampato omonimo)
      const dir = await cartellaPercorso(cartella, [MATERIALE_CLS, wbs, 'pdf'], { create: true });
      if (dir) await copiaFileIn(dir, new File([blob], nome, { type: XLSX_MIME }), nome);
      // download nel browser
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      // marca la scheda esportata (la data la dà la UI, non la domain)
      const next = schede.map((s) =>
        s.id === sch.id
          ? { ...s, esportato: true, esportatoIl: new Date().toISOString(), fileXlsx: nome }
          : s,
      );
      await persisti(next);
      setMessaggio(
        `Esportata: ${nome} (salvata in ${wbs}/pdf/ e scaricata). Aprila in Excel, rifinisci ed esporta il PDF.`,
      );
    } catch (e) {
      setMessaggio(`Errore di export: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Apre il documento della scheda: PDF omonimo se esiste (congelato), altrimenti l'.xlsx (vivo). */
  async function apriDocumento(sch: SchedaExport) {
    if (!cartella || !sch.fileXlsx) return;
    const wbs = sch.wbs ?? 'WBS';
    const dir = await cartellaPercorso(cartella, [MATERIALE_CLS, wbs, 'pdf']);
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
        Ogni scheda contiene <strong>max 6 controlli completi</strong> (= 6 terzine ST36). Flagga i
        controlli da stampare (max 6), poi «Esporta selezionati (.xlsx)»: genera il documento ST36
        in Excel (aprilo, rifinisci Denominazione/pk, esporta il PDF e depositalo in OneDrive).
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
        const dataIt = sch.esportatoIl
          ? new Date(sch.esportatoIl).toLocaleDateString('it-IT')
          : '—';
        const stato = stale
          ? { txt: 'DA RIESPORTARE', cls: styles.bdgStale }
          : sch.esportato
            ? { txt: `Esportata il ${dataIt}`, cls: styles.bdgOk }
            : { txt: 'Da esportare', cls: styles.bdgTodo };
        const altre = schede.filter((x) => x.id !== sch.id);
        const flaggati = sch.controlliIds.filter((c) => selezionati.has(c)).length;
        return (
          <article key={sch.id} className={styles.scheda} aria-label={`Scheda ${sch.numero}`}>
            <header className={styles.schTesta}>
              <h3 className={styles.schTitolo}>
                Scheda {sch.numero}
                {sch.wbs ? ` · ${sch.wbs}` : ''} · {sch.controlliIds.length}/6
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
              const flag = selezionati.has(cid);
              const flagDisabilitato = !flag && flaggati >= 6; // max 6 per scheda
              return (
                <div key={cid} className={styles.controlloBox}>
                  <label
                    className={styles.flag}
                    title={flagDisabilitato ? 'Massimo 6 controlli per scheda' : ''}
                  >
                    <input
                      type="checkbox"
                      checked={flag}
                      disabled={flagDisabilitato}
                      onChange={(e) => flagga(cid, e.target.checked)}
                    />
                    <span>Includi nell'export ({flaggati}/6)</span>
                  </label>
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
