import { useMemo, useState } from 'react';
import { esitiPrelievoAcciaio, type EsitoParam } from '../../domain/index.ts';
import { parseSiglaImport, type PrelievoAcciaio, type Terna } from '../../core/index.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { useStore } from '../../stato/store.ts';
import { EsitoBadge } from '../comuni/EsitoBadge.tsx';
import { ScrollOrizzontale } from '../comuni/ScrollOrizzontale.tsx';
import tab from '../cls/TabellaPrelievi.module.css';
import styles from './AcciaioTabella.module.css';

interface Filtri {
  wbs: string;
  diametro: string;
  produttore: string;
  q: string;
}
const FILTRI_VUOTI: Filtri = { wbs: '', diametro: '', produttore: '', q: '' };

function uniche(valori: (string | undefined)[]): string[] {
  return [...new Set(valori.filter((v): v is string => !!v && v.trim() !== ''))];
}
function numeroSigla(verbale: string): number {
  return parseSiglaImport(verbale)?.numero ?? Number.MAX_SAFE_INTEGER;
}

/** Esito di un parametro → badge (Positivo/Negativo/incompleto-neutro). */
function BadgeEsito({ esito }: { esito: EsitoParam }) {
  if (esito === 'incompleto') return <EsitoBadge conforme={false} stato="incompleto" testo="—" />;
  return <EsitoBadge conforme={esito === 'Positivo'} testo={esito} />;
}

/** Terna dei 3 saggi in una cella (v1 / v2 / v3). */
function CellaTerna({ valori }: { valori: Terna }) {
  return (
    <td className={styles.terna}>
      {valori.map((v, i) => (
        <span key={i}>
          {i > 0 ? <span className={styles.sep}>/</span> : null}
          {Number.isFinite(v) ? formattaNumeroIt(v) : '—'}
        </span>
      ))}
    </td>
  );
}

export function TabellaPrelieviAcciaio() {
  const prelievi = useStore((s) => s.prelieviAcciaio);
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI);

  const ordinati = useMemo<PrelievoAcciaio[]>(
    () => [...prelievi].sort((a, b) => numeroSigla(a.verbale) - numeroSigla(b.verbale)),
    [prelievi],
  );

  const opzioni = useMemo(
    () => ({
      wbs: uniche(prelievi.map((p) => p.wbs)).sort(),
      diametro: uniche(
        prelievi.map((p) => (Number.isFinite(p.diametro) ? String(p.diametro) : undefined)),
      ).sort((a, b) => Number(a) - Number(b)),
      produttore: uniche(prelievi.map((p) => p.produttore)).sort(),
    }),
    [prelievi],
  );

  const filtrate = useMemo(() => {
    const q = filtri.q.trim().toLowerCase();
    return ordinati.filter((p) => {
      if (filtri.wbs && p.wbs !== filtri.wbs) return false;
      if (filtri.diametro && String(p.diametro) !== filtri.diametro) return false;
      if (filtri.produttore && p.produttore !== filtri.produttore) return false;
      if (
        q &&
        !`${p.verbale} ${p.opera ?? ''} ${p.parte ?? ''} ${p.produttore} ${p.colata ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [ordinati, filtri]);

  const set = (k: keyof Filtri) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFiltri((f) => ({ ...f, [k]: e.target.value }));

  const ubi = (p: PrelievoAcciaio) => p.ubicazione ?? p.parte ?? '—';

  if (prelievi.length === 0) {
    return (
      <p className={tab.vuoto}>
        Nessun prelievo acciaio caricato. Importa un registro AC1 per iniziare.
      </p>
    );
  }

  return (
    <section aria-labelledby="tab-acc-titolo">
      <div className={tab.barra}>
        <h2 id="tab-acc-titolo" className={tab.titolo}>
          Prelievi acciaio
        </h2>
        <p className={tab.conteggio} role="status" aria-live="polite">
          {filtrate.length} prelievi
          {filtrate.length !== prelievi.length ? ` di ${prelievi.length}` : ''}
        </p>
      </div>

      <div className={tab.filtri}>
        <Selettore label="WBS" value={filtri.wbs} onChange={set('wbs')} opzioni={opzioni.wbs} />
        <Selettore
          label="Ø mm"
          value={filtri.diametro}
          onChange={set('diametro')}
          opzioni={opzioni.diametro}
        />
        <Selettore
          label="Produttore"
          value={filtri.produttore}
          onChange={set('produttore')}
          opzioni={opzioni.produttore}
        />
        <label className={tab.campo}>
          <span className={tab.campoLbl}>Ricerca</span>
          <input
            type="search"
            value={filtri.q}
            onChange={set('q')}
            placeholder="verbale, opera, produttore, colata…"
            className={tab.search}
          />
        </label>
        <button type="button" className={tab.reset} onClick={() => setFiltri(FILTRI_VUOTI)}>
          Azzera filtri
        </button>
      </div>

      <ScrollOrizzontale className={tab.scroll}>
        <table className={tab.tabella}>
          <caption className={tab.caption}>
            Registro prelievi acciaio (B450C). Gli esiti sono CALCOLATI dall’engine (soglie complete
            §11.3.2), non importati dal registro. Colonna «Verbale» fissa; scorri a destra.
          </caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2} className={tab.sticky}>
                Verbale
              </th>
              <th scope="col" rowSpan={2}>
                Data
              </th>
              <th scope="col" rowSpan={2}>
                WBS
              </th>
              <th scope="col" rowSpan={2}>
                Opera
              </th>
              <th scope="colgroup" colSpan={2} className={styles.banda}>
                Parte di opera
              </th>
              <th scope="col" rowSpan={2}>
                Produttore
              </th>
              <th scope="col" rowSpan={2} className={tab.num}>
                Ø
              </th>
              <th scope="col" rowSpan={2}>
                Colata
              </th>
              <th scope="col" rowSpan={2}>
                DDT
              </th>
              <th scope="col" rowSpan={2}>
                Prot. Rich. D.L.
              </th>
              <th scope="col" rowSpan={2}>
                Prot. Ricezione
              </th>
              <th scope="col" rowSpan={2}>
                Laboratorio
              </th>
              <th scope="col" rowSpan={2}>
                Data prova
              </th>
              <th scope="col" rowSpan={2}>
                Certificato
              </th>
              <th scope="colgroup" colSpan={4} className={styles.banda}>
                Risultati prove (3 saggi)
              </th>
              <th scope="colgroup" colSpan={4} className={styles.banda}>
                Esiti (calcolati)
              </th>
              <th scope="col" rowSpan={2}>
                Note
              </th>
            </tr>
            <tr>
              <th scope="col">Ubicazione</th>
              <th scope="col">Denominazione</th>
              <th scope="col" className={tab.num}>
                fy [N/mm²]
              </th>
              <th scope="col" className={tab.num}>
                Agt [%]
              </th>
              <th scope="col" className={tab.num}>
                ft/fy
              </th>
              <th scope="col">Piega</th>
              <th scope="col">Esito fy</th>
              <th scope="col">Esito Agt</th>
              <th scope="col">Esito ft/fy</th>
              <th scope="col">Esito piega</th>
            </tr>
          </thead>
          <tbody>
            {filtrate.map((p) => {
              const e = esitiPrelievoAcciaio(p);
              return (
                <tr key={p.id}>
                  <th scope="row" className={`${tab.code} ${tab.sticky}`}>
                    {p.verbale}
                  </th>
                  <td>{p.data || '—'}</td>
                  <td className={tab.code}>{p.wbs || '—'}</td>
                  <td>{p.opera ?? '—'}</td>
                  <td className={tab.parte}>{ubi(p)}</td>
                  <td className={tab.parte}>{p.denominazione ?? '—'}</td>
                  <td>{p.produttore || '—'}</td>
                  <td className={tab.num}>{Number.isFinite(p.diametro) ? p.diametro : '—'}</td>
                  <td className={tab.code}>{p.colata ?? '—'}</td>
                  <td className={tab.code}>{p.ddt ?? '—'}</td>
                  <td className={tab.code}>{p.protRichiestaDL ?? '—'}</td>
                  <td className={tab.code}>{p.protRicezione ?? '—'}</td>
                  <td>{p.laboratorio ?? '—'}</td>
                  <td>{p.dataProva ?? '—'}</td>
                  <td className={tab.code}>{p.certificato ?? '—'}</td>
                  <CellaTerna valori={p.fy} />
                  <CellaTerna valori={p.agt} />
                  <CellaTerna valori={p.ftfy} />
                  <td>{p.piega || '—'}</td>
                  <td className={styles.esito}>
                    <BadgeEsito esito={e.fy} />
                  </td>
                  <td className={styles.esito}>
                    <BadgeEsito esito={e.agt} />
                  </td>
                  <td className={styles.esito}>
                    <BadgeEsito esito={e.ftfy} />
                  </td>
                  <td className={styles.esito}>
                    <BadgeEsito esito={e.piega} />
                  </td>
                  <td>{p.note ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollOrizzontale>
    </section>
  );
}

interface SelProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  opzioni: string[];
}
function Selettore({ label, value, onChange, opzioni }: SelProps) {
  return (
    <label className={tab.campo}>
      <span className={tab.campoLbl}>{label}</span>
      <select value={value} onChange={onChange} className={tab.select}>
        <option value="">Tutti</option>
        {opzioni.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
