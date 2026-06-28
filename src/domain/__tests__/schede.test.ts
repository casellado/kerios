import { describe, expect, it } from 'vitest';
import type { ControlloSalvato } from '../../core/index.ts';
import { raggruppaInSchede, spostaControllo, validaSchede, schedeStale } from '../schede.ts';

function ctrl(
  id: string,
  wbs = 'ST11',
  esito: ControlloSalvato['esito'] = 'conforme',
): ControlloSalvato {
  return {
    id,
    wbs,
    tipo: 'A',
    rck: 40,
    prelieviIds: [id],
    esito,
    n: 3,
    forzato: false,
    generato: 'G',
  };
}
const ids = (s: { controlliIds: string[] }) => s.controlliIds;

describe('raggruppaInSchede — pacchetti ≤6 per WBS', () => {
  it('spezza a 6: 7 controlli stessa WBS → [6, 1]', () => {
    const schede = raggruppaInSchede(Array.from({ length: 7 }, (_, i) => ctrl(`c${i}`)));
    expect(schede.map((s) => s.controlliIds.length)).toEqual([6, 1]);
    expect(schede.map((s) => s.numero)).toEqual([1, 2]);
  });

  it('per WBS: opere diverse → schede separate (non si mescolano)', () => {
    const schede = raggruppaInSchede([ctrl('a', 'ST11'), ctrl('b', 'ST36'), ctrl('c', 'ST11')]);
    // ST11 → {a,c}, ST36 → {b}
    const wbsDelle = schede.map((s) => s.wbs);
    expect(new Set(wbsDelle)).toEqual(new Set(['ST11', 'ST36']));
    const st11 = schede.find((s) => s.wbs === 'ST11')!;
    expect(ids(st11).sort()).toEqual(['a', 'c']);
  });

  it('esclude i controlli APERTI (incompleti)', () => {
    const schede = raggruppaInSchede([ctrl('ok'), ctrl('aperto', 'ST11', 'incompleto')]);
    expect(schede.flatMap(ids)).toEqual(['ok']);
  });
});

describe('spostaControllo — vincoli (≤6, una sola scheda)', () => {
  it('sposta dall’origine alla destinazione (rimuove dall’origine)', () => {
    const s = raggruppaInSchede(Array.from({ length: 7 }, (_, i) => ctrl(`c${i}`)));
    // scheda-1 = c0..c5, scheda-2 = c6. Sposto c0 in scheda-2.
    const { schede, errore } = spostaControllo(s, 'c0', 'scheda-2');
    expect(errore).toBeUndefined();
    expect(schede.find((x) => x.id === 'scheda-1')!.controlliIds).not.toContain('c0');
    expect(schede.find((x) => x.id === 'scheda-2')!.controlliIds).toContain('c0');
  });

  it('destinazione piena (6) → errore, nessuna modifica', () => {
    const s = raggruppaInSchede(Array.from({ length: 7 }, (_, i) => ctrl(`c${i}`)));
    const { schede, errore } = spostaControllo(s, 'c6', 'scheda-1'); // scheda-1 ha già 6
    expect(errore).toMatch(/piena/i);
    expect(schede.find((x) => x.id === 'scheda-2')!.controlliIds).toContain('c6'); // invariato
  });
});

describe('validaSchede — niente doppioni / niente dimenticati', () => {
  it('copertura totale, nessun doppione → ok', () => {
    const cs = [ctrl('a'), ctrl('b')];
    expect(validaSchede(cs, raggruppaInSchede(cs)).ok).toBe(true);
  });

  it('coglie DIMENTICATI (completo non in alcuna scheda)', () => {
    const cs = [ctrl('a'), ctrl('b')];
    const p = validaSchede(cs, raggruppaInSchede([ctrl('a')])); // b dimenticato
    expect(p.dimenticati).toEqual(['b']);
    expect(p.ok).toBe(false);
  });

  it('coglie DOPPIONI (stesso controllo in due schede)', () => {
    const schede = [
      { id: 's1', numero: 1, controlliIds: ['a'], esportato: false },
      { id: 's2', numero: 2, controlliIds: ['a'], esportato: false },
    ];
    const p = validaSchede([ctrl('a')], schede);
    expect(p.doppioni).toEqual(['a']);
    expect(p.ok).toBe(false);
  });
});

describe('schedeStale — controllo modificato dopo export (id cambiato)', () => {
  it('segnala le schede che puntano a id non più esistenti', () => {
    const schede = raggruppaInSchede([ctrl('vecchio')]).map((s) => ({ ...s, esportato: true }));
    // dopo modifica: il controllo ha id 'nuovo' (id per contenuto), 'vecchio' non esiste più
    const stale = schedeStale(schede, new Set(['nuovo']));
    expect(stale).toHaveLength(1);
    expect(schedeStale(schede, new Set(['vecchio']))).toHaveLength(0); // ancora valido
  });
});
