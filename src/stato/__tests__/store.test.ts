import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store.ts';

const stato = () => useStore.getState();

describe('store — flag SPORCO (modifiche non salvate, M4 micro-fix)', () => {
  beforeEach(() => {
    useStore.setState({ sporco: false });
  });

  it('parte pulito', () => {
    expect(stato().sporco).toBe(false);
  });

  it('segnaSporco → true; segnaPulito → false', () => {
    stato().segnaSporco();
    expect(stato().sporco).toBe(true);
    stato().segnaPulito();
    expect(stato().sporco).toBe(false);
  });

  it('flusso: pulito → scollega DIRETTO (niente avviso)', () => {
    // la decisione UI è proprio `sporco`: false ⇒ nessun dialog
    expect(stato().sporco).toBe(false);
    const mostraDialog = stato().sporco;
    expect(mostraDialog).toBe(false);
  });

  it('flusso: modifica → sporco ⇒ chiede conferma; dopo salvataggio ⇒ scollega diretto', () => {
    // una modifica (salva/elimina/svuota/import) accende lo sporco
    stato().segnaSporco();
    expect(stato().sporco).toBe(true); // ⇒ il dialog a 3 vie compare

    // "Salva e scollega": un salvataggio riuscito pulisce lo stato
    stato().segnaPulito();
    expect(stato().sporco).toBe(false); // ⇒ scollega diretto, nessun avviso

    // una nuova modifica torna a sporcare (l'avviso ricompare solo se serve)
    stato().segnaSporco();
    expect(stato().sporco).toBe(true);
  });
});
