import { useMemo, useState } from 'react';
import { descriviPrelievo, type VistaPrelievo } from '../../domain/index.ts';
import { parseSiglaImport } from '../../core/index.ts';
import { formattaNumeroIt } from '../../io/formato.ts';
import { useStore } from '../../stato/store.ts';
import { Semaforo } from '../comuni/Semaforo.tsx';
import styles from './TabellaPrelievi.module.css';

interface Filtri {
  wbs: string;
  parte: string;
  rck: string;
  mix: string;
  q: string;
}
const FILTRI_VUOTI: Filtri = { wbs: '', parte: '', rck: '', mix: '', q: '' };

function uniche(valori: (string | undefined)[]): string[] {
  return [...new Set(valori.filter((v): v is string => !!v && v.trim() !== ''))];
}

function numeroSigla(verbale: string): number {
  return parseSiglaImport(verbale)?.numero ?? Number.MAX_SAFE_INTEGER;
}

export function TabellaPrelievi() {
  const prelievi = useStore((s) => s.prelievi);
  const soglie = useStore((s) => s.soglie);
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI);

  const viste = useMemo<VistaPrelievo[]>(
    () =>
      prelievi
        .map((p) => descriviPrelievo(p, soglie))
        .sort((a, b) => numeroSigla(a.prelievo.verbale) - numeroSigla(b.prelievo.verbale)),
    [prelievi, soglie],
  );

  const opzioni = useMemo(
    () => ({
      wbs: uniche(prelievi.map((p) => p.wbs)).sort(),
      parte: uniche(prelievi.map((p) => p.parte)).sort(),
      rck: uniche(prelievi.map((p) => (Number.isFinite(p.rck) ? String(p.rck) : undefined))).sort(
        (a, b) => Number(a) - Number(b),
      ),
      mix: uniche(prelievi.map((p) => p.mix)).sort(),
    }),
    [prelievi],
  );

  const filtrate = useMemo(() => {
    const q = filtri.q.trim().toLowerCase();
    return viste.filter(({ prelievo: p }) => {
      if (filtri.wbs && p.wbs !== filtri.wbs) return false;
      if (filtri.parte && p.parte !== filtri.parte) return false;
      if (filtri.rck && String(p.rck) !== filtri.rck) return false;
      if (filtri.mix && p.mix !== filtri.mix) return false;
      if (q && !`${p.verbale} ${p.parte} ${p.mix} ${p.laboratorio ?? ''}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [viste, filtri]);

  const set = (k: keyof Filtri) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFiltri((f) => ({ ...f, [k]: e.target.value }));

  if (prelievi.length === 0) {
    return (
      <p className={styles.vuoto}>Nessun prelievo caricato. Importa un registro per iniziare.</p>
    );
  }

  return (
    <section aria-labelledby="tab-titolo">
      <div className={styles.barra}>
        <h2 id="tab-titolo" className={styles.titolo}>
          Prelievi
        </h2>
        <p className={styles.conteggio} role="status" aria-live="polite">
          {filtrate.length} prelievi
          {filtrate.length !== prelievi.length ? ` di ${prelievi.length}` : ''}
        </p>
      </div>

      <div className={styles.filtri}>
        <Selettore label="WBS" value={filtri.wbs} onChange={set('wbs')} opzioni={opzioni.wbs} />
        <Selettore
          label="Parte d'opera"
          value={filtri.parte}
          onChange={set('parte')}
          opzioni={opzioni.parte}
        />
        <Selettore label="Rck" value={filtri.rck} onChange={set('rck')} opzioni={opzioni.rck} />
        <Selettore label="Mix" value={filtri.mix} onChange={set('mix')} opzioni={opzioni.mix} />
        <label className={styles.campo}>
          <span className={styles.campoLbl}>Ricerca</span>
          <input
            type="search"
            value={filtri.q}
            onChange={set('q')}
            placeholder="verbale, parte, mix…"
            className={styles.search}
          />
        </label>
        <button type="button" className={styles.reset} onClick={() => setFiltri(FILTRI_VUOTI)}>
          Azzera filtri
        </button>
      </div>

      <div className={styles.scroll}>
        <table className={styles.tabella}>
          <caption className={styles.caption}>
            Registro prelievi calcestruzzo — esito preliminare e fasi temporali
          </caption>
          <thead>
            <tr>
              <th scope="col">Verbale</th>
              <th scope="col">Data</th>
              <th scope="col">Parte d'opera</th>
              <th scope="col">Mix</th>
              <th scope="col" className={styles.num}>
                Rck
              </th>
              <th scope="col" className={styles.num}>
                R1
              </th>
              <th scope="col" className={styles.num}>
                R2
              </th>
              <th scope="col" className={styles.num}>
                R medio
              </th>
              <th scope="col">Esito</th>
              <th scope="col" className={styles.num}>
                Stagionatura
              </th>
            </tr>
          </thead>
          <tbody>
            {filtrate.map((v) => {
              const p = v.prelievo;
              return (
                <tr key={p.id}>
                  <th scope="row" className={styles.code}>
                    {p.verbale}
                  </th>
                  <td>{p.data}</td>
                  <td className={styles.parte}>{p.parte}</td>
                  <td className={styles.code}>{p.mix}</td>
                  <td className={styles.num}>{formattaNumeroIt(p.rck)}</td>
                  <td className={styles.num}>{formattaNumeroIt(p.r1)}</td>
                  <td className={styles.num}>{formattaNumeroIt(p.r2)}</td>
                  <td className={styles.num}>{formattaNumeroIt(v.rc, soglie.decimaliDisplay)}</td>
                  <td>
                    <Semaforo preliminare={v.preliminare} stato={v.stato} />
                  </td>
                  <td className={styles.num} title={v.avvisoStagionatura ?? ''}>
                    {v.stagionaturaGg != null ? `${v.stagionaturaGg} gg` : '—'}
                    {v.avvisoStagionatura ? <span className={styles.warn}> ⚠</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
    <label className={styles.campo}>
      <span className={styles.campoLbl}>{label}</span>
      <select value={value} onChange={onChange} className={styles.select}>
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
