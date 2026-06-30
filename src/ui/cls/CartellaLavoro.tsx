import { useEffect, useId, useRef, useState } from 'react';
import {
  FSA_SUPPORTATO,
  assicuraPermesso,
  creaStruttura,
  dimenticaHandleCommessa,
  recuperaHandleCommessa,
  salvaHandleCommessa,
  scegliCartellaCommessa,
  verificaStruttura,
  type HandleCartella,
} from '../../io/workspace.ts';
import {
  applicaProgettoACache,
  caricaProgettoDaCartella,
  costruisciProgetto,
  salvaProgettoSuCartella,
  serializzaProgetto,
  statoCacheCls,
  validaProgetto,
} from '../../io/progetto.ts';
import { caricaProfilo } from '../../io/profilo.ts';
import { useStore } from '../../stato/store.ts';
import { DialogModifiche } from '../comuni/DialogModifiche.tsx';
import styles from './CartellaLavoro.module.css';

type Tono = 'info' | 'ok' | 'errore';

/**
 * Cartella di lavoro (M4). Collega una cartella COMMESSA, ne EREDITA il
 * contenuto (file di progetto), salva nella cartella, e al riavvio la ritrova
 * con un clic di consenso. La cartella è la verità; IndexedDB è solo cache.
 * Fallback con grazia se File System Access è assente (Firefox/Safari/mobile):
 * scarica/apri il progetto come file .json.
 */
export function CartellaLavoro() {
  const ricarica = useStore((s) => s.ricarica);
  const sporco = useStore((s) => s.sporco);
  const segnaPulito = useStore((s) => s.segnaPulito);
  const setCartella = useStore((s) => s.setCartella);
  const setIntestazione = useStore((s) => s.setIntestazione);
  const setDirettoreLavori = useStore((s) => s.setDirettoreLavori);
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  // handle collegato e attivo (permesso concesso in questa sessione)
  const [handle, setHandle] = useState<HandleCartella | null>(null);
  // handle ripreso da IndexedDB al riavvio, in attesa del clic di consenso
  const [daRiaprire, setDaRiaprire] = useState<HandleCartella | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [tono, setTono] = useState<Tono>('info');
  const [occupato, setOccupato] = useState(false);
  // dialog "modifiche non salvate" prima di un'azione che scarta la cache sporca
  // (scollega o ricarica). null = nessuna conferma in corso.
  const [conferma, setConferma] = useState<'scollega' | 'ricarica' | null>(null);

  function avvisa(testo: string, t: Tono = 'info') {
    setMessaggio(testo);
    setTono(t);
  }

  // al montaggio: ritrova l'handle salvato, ma NON chiede il permesso da solo
  // (serve un gesto utente) → propone "Riapri «nome»".
  useEffect(() => {
    let attivo = true;
    void recuperaHandleCommessa()
      .then((h) => {
        if (attivo && h) setDaRiaprire(h);
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, []);

  /** Eredita il progetto dalla cartella → rigenera la cache → notifica le viste. */
  async function ereditaDa(dir: HandleCartella): Promise<void> {
    // intestazione + Direttore Lavori dal profilo (assente/vecchio → vuoti, nessun blocco)
    const profilo = await caricaProfilo(dir);
    setIntestazione(profilo?.intestazione ?? '');
    setDirettoreLavori(profilo?.direttoreLavori ?? '');
    const progetto = await caricaProgettoDaCartella(dir);
    if (progetto) {
      await applicaProgettoACache(progetto);
      ricarica();
      segnaPulito(); // appena ereditato: la cache combacia con la cartella-verità
      avvisa(
        `Collegata «${dir.name}» · ereditati ${progetto.cls.prelievi.length} prelievi e ${progetto.cls.controlli.length} controlli.`,
        'ok',
      );
    } else {
      // commessa senza progetto: si parte dal lavoro già in cache (import M2).
      avvisa(`Collegata «${dir.name}» · nessun progetto salvato: parti e poi salva.`, 'ok');
    }
  }

  async function collega() {
    setOccupato(true);
    try {
      const dir = await scegliCartellaCommessa();
      if (!dir) {
        avvisa('Collegamento annullato.');
        return;
      }
      if (!(await assicuraPermesso(dir))) {
        avvisa('Permesso negato sulla cartella.', 'errore');
        return;
      }
      const struttura = await verificaStruttura(dir);
      if (!struttura.completa) {
        const crea = window.confirm(
          `La cartella «${dir.name}» non ha la struttura Kerios (mancano: ${struttura.mancano.join(', ')}).\n\n` +
            `Vuoi che Kerios la crei? Annulla se hai scelto la cartella sbagliata.`,
        );
        if (!crea) {
          avvisa('Collegamento annullato: struttura non creata.');
          return;
        }
        await creaStruttura(dir);
      }
      await salvaHandleCommessa(dir);
      setHandle(dir);
      setCartella(dir); // disponibile alle celle-documento (M5)
      setDaRiaprire(null);
      await ereditaDa(dir);
    } catch (e) {
      avvisa(`Errore di collegamento: ${e instanceof Error ? e.message : String(e)}`, 'errore');
    } finally {
      setOccupato(false);
    }
  }

  async function riapri() {
    if (!daRiaprire) return;
    setOccupato(true);
    try {
      if (!(await assicuraPermesso(daRiaprire))) {
        avvisa('Permesso negato: riprova il consenso.', 'errore');
        return;
      }
      setHandle(daRiaprire);
      setCartella(daRiaprire); // disponibile alle celle-documento (M5)
      setDaRiaprire(null);
      await ereditaDa(daRiaprire);
    } catch (e) {
      avvisa(`Errore in riapertura: ${e instanceof Error ? e.message : String(e)}`, 'errore');
    } finally {
      setOccupato(false);
    }
  }

  /** Salva nel progetto. Ritorna true se è andato a buon fine. */
  async function salva(): Promise<boolean> {
    if (!handle) return false;
    setOccupato(true);
    try {
      if (!(await assicuraPermesso(handle))) {
        avvisa('Permesso negato in scrittura: riprova il consenso.', 'errore');
        return false;
      }
      const { prelievi, controlli, schede } = await statoCacheCls();
      const p = await salvaProgettoSuCartella(handle, {
        commessa: handle.name,
        prelievi,
        controlli,
        schede,
        aggiornato: new Date().toISOString(),
      });
      segnaPulito(); // dati versati nella cartella-verità
      avvisa(
        `Salvato in «${handle.name}» · ${p.cls.prelievi.length} prelievi, ${p.cls.controlli.length} controlli. Copialo nella verità OneDrive quando hai finito la WBS.`,
        'ok',
      );
      return true;
    } catch (e) {
      avvisa(`Errore di salvataggio: ${e instanceof Error ? e.message : String(e)}`, 'errore');
      return false;
    } finally {
      setOccupato(false);
    }
  }

  /** Ricarica effettiva dalla cartella (scarta la cache, rilegge la verità). */
  async function eseguiRicarica() {
    if (!handle) return;
    setOccupato(true);
    try {
      if (!(await assicuraPermesso(handle, 'read'))) {
        avvisa('Permesso negato in lettura: riprova il consenso.', 'errore');
        return;
      }
      await ereditaDa(handle);
    } catch (e) {
      avvisa(`Errore in ricarica: ${e instanceof Error ? e.message : String(e)}`, 'errore');
    } finally {
      setOccupato(false);
    }
  }

  /** Scollegamento effettivo (dopo l'eventuale conferma sulle modifiche). */
  async function eseguiScollega() {
    await dimenticaHandleCommessa();
    setHandle(null);
    setCartella(null);
    setIntestazione('');
    setDirettoreLavori('');
    setDaRiaprire(null);
    avvisa('Cartella scollegata. La cache resta finché non la ricarichi o reimporti.');
  }

  /**
   * Esegue l'azione che scarta la cache sporca. Se ci sono modifiche non salvate
   * chiede prima conferma (DialogModifiche); altrimenti procede diretto.
   * `ricarica` e `scollega` corrono lo STESSO rischio → protezione uniforme.
   */
  function richiediAzione(azione: 'scollega' | 'ricarica') {
    if (sporco) {
      setConferma(azione);
      return;
    }
    void (azione === 'scollega' ? eseguiScollega() : eseguiRicarica());
  }

  async function confermaSalvaEProcedi() {
    const azione = conferma;
    setConferma(null);
    if (!(await salva())) return; // se il salvataggio fallisce, NON si procede
    await (azione === 'scollega' ? eseguiScollega() : eseguiRicarica());
  }

  function confermaProcediSenzaSalvare() {
    const azione = conferma;
    setConferma(null);
    void (azione === 'scollega' ? eseguiScollega() : eseguiRicarica());
  }

  // --- Fallback senza File System Access: progetto come file .json ----------

  async function scaricaProgetto() {
    setOccupato(true);
    try {
      const { prelievi, controlli, schede } = await statoCacheCls();
      const p = costruisciProgetto({
        commessa: 'kerios',
        prelievi,
        controlli,
        schede,
        aggiornato: new Date().toISOString(),
      });
      const blob = new Blob([serializzaProgetto(p)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'progetto.kerios.json';
      a.click();
      URL.revokeObjectURL(url);
      segnaPulito(); // il fallback "scarica" è un salvataggio del progetto
      avvisa('Progetto scaricato.', 'ok');
    } finally {
      setOccupato(false);
    }
  }

  function onFileProgetto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setOccupato(true);
    void (async () => {
      try {
        const p = validaProgetto(JSON.parse(await file.text()));
        await applicaProgettoACache(p);
        ricarica();
        segnaPulito(); // appena aperto da file: cache == progetto su disco
        avvisa(
          `Progetto aperto · ${p.cls.prelievi.length} prelievi, ${p.cls.controlli.length} controlli.`,
          'ok',
        );
      } catch (e) {
        avvisa(`File non valido: ${e instanceof Error ? e.message : String(e)}`, 'errore');
      } finally {
        setOccupato(false);
        if (fileInput.current) fileInput.current.value = '';
      }
    })();
  }

  const statoClasse = tono === 'errore' ? styles.statoErrore : tono === 'ok' ? styles.statoOk : '';

  return (
    <section className={styles.box} aria-labelledby={`${inputId}-lbl`}>
      <h2 id={`${inputId}-lbl`} className={styles.titolo}>
        Cartella di lavoro
      </h2>

      {FSA_SUPPORTATO ? (
        <div className={styles.azioni} role="group" aria-label="Cartella di lavoro">
          {handle ? (
            <>
              <span className={styles.collegata}>
                Commessa: <strong>{handle.name}</strong>
              </span>
              <button
                type="button"
                className={styles.primario}
                disabled={occupato}
                onClick={() => void salva()}
              >
                Salva nella cartella
              </button>
              <button
                type="button"
                className={styles.secondario}
                disabled={occupato}
                onClick={() => richiediAzione('ricarica')}
              >
                Ricarica dalla cartella
              </button>
              <button
                type="button"
                className={styles.tenue}
                disabled={occupato}
                onClick={() => richiediAzione('scollega')}
              >
                Scollega
              </button>
            </>
          ) : daRiaprire ? (
            <>
              <span className={styles.collegata}>
                Cartella trovata: <strong>{daRiaprire.name}</strong>
              </span>
              <button
                type="button"
                className={styles.primario}
                disabled={occupato}
                onClick={() => void riapri()}
              >
                Riapri «{daRiaprire.name}» (consenti accesso)
              </button>
              <button
                type="button"
                className={styles.tenue}
                disabled={occupato}
                onClick={() => void eseguiScollega()}
              >
                Dimentica
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.primario}
              disabled={occupato}
              onClick={() => void collega()}
            >
              Collega cartella commessa…
            </button>
          )}
        </div>
      ) : (
        <div className={styles.azioni} role="group" aria-label="Progetto (file)">
          <p className={styles.nota}>
            La modalità «cartella di lavoro» richiede Chrome o Edge desktop. Qui puoi salvare e
            riaprire il progetto come file.
          </p>
          <button
            type="button"
            className={styles.primario}
            disabled={occupato}
            onClick={() => void scaricaProgetto()}
          >
            Salva progetto (scarica)
          </button>
          <label htmlFor={`${inputId}-file`} className={styles.secondario}>
            Apri progetto…
          </label>
          <input
            ref={fileInput}
            id={`${inputId}-file`}
            type="file"
            accept="application/json,.json"
            className={styles.fileNascosto}
            onChange={onFileProgetto}
          />
        </div>
      )}

      <p className={`${styles.stato} ${statoClasse}`} role="status" aria-live="polite">
        {messaggio}
      </p>

      {conferma && (
        <DialogModifiche
          azione={conferma === 'scollega' ? 'scollegare' : 'ricaricare'}
          onSalvaEProcedi={() => void confermaSalvaEProcedi()}
          onProcediSenzaSalvare={confermaProcediSenzaSalvare}
          onAnnulla={() => setConferma(null)}
        />
      )}
    </section>
  );
}
