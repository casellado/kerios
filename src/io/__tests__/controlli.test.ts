import 'fake-indexeddb/auto'; // deve precedere l'import di db.ts (IndexedDB simulato)
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRegistroClsCsv } from '../csv.ts';
import { costruisciControlloSalvato, raggruppa } from '../../domain/index.ts';
import { db } from '../db.ts';
import { salvaControllo, caricaTuttiControlli } from '../controlli.ts';

const CSV = fileURLToPath(
  new URL('../../../reference/dati-reali/Registro_CLS_ST11.csv', import.meta.url),
);
const prelievi = parseRegistroClsCsv(new Uint8Array(readFileSync(CSV))).prelievi;
const byId = new Map(prelievi.map((p) => [p.id, p]));
// primi 3 gruppi PIENI (3 prelievi) della strategia auto → Rck eff diversi
const gruppiPieni = raggruppa(prelievi, 'auto')
  .filter((g) => g.prelieviIds.length === 3)
  .slice(0, 3)
  .map((g) => g.prelieviIds.map((id) => byId.get(id)!));

describe('P3 — costruisciControlloSalvato cattura uno SNAPSHOT fedele (no riferimenti condivisi)', () => {
  it('gruppi diversi → snapshot con valori DIVERSI (Rck eff, n, prelievi)', () => {
    const snap = gruppiPieni.map((pr, i) =>
      costruisciControlloSalvato(pr, { id: `c${i}`, generato: '2026-06-28T00:00:00Z' }),
    );
    const rckEff = snap.map((c) => c.rckEffettiva);
    // i 3 controlli hanno Rck effettive DISTINTE (regressione del bug "tutti uguali")
    expect(new Set(rckEff).size).toBe(rckEff.length);
    // ogni snapshot riporta i SUOI prelievi
    snap.forEach((c, i) => expect(c.prelieviIds).toEqual(gruppiPieni[i].map((p) => p.id)));
  });

  it('prelieviIds è una COPIA: mutare l’array di origine non tocca lo snapshot', () => {
    const origine = [...gruppiPieni[0]];
    const c = costruisciControlloSalvato(origine, { id: 'x', generato: '2026-06-28T00:00:00Z' });
    const prima = [...c.prelieviIds];
    origine.push(gruppiPieni[1][0]); // muto l'origine dopo il salvataggio
    expect(c.prelieviIds).toEqual(prima); // lo snapshot non cambia
  });

  it('gruppo n<3 → esito "incompleto" (mai conforme/non conforme)', () => {
    const c = costruisciControlloSalvato([gruppiPieni[0][0]], {
      id: 'i',
      generato: '2026-06-28T00:00:00Z',
    });
    expect(c.n).toBe(1);
    expect(c.esito).toBe('incompleto');
  });
});

describe('P3 — round-trip su IndexedDB: ogni controllo salvato conserva i SUOI valori', () => {
  beforeEach(async () => {
    await db.controlliCls.clear();
  });

  it('salvo 3 controlli diversi e li rileggo con valori diversi', async () => {
    for (let i = 0; i < gruppiPieni.length; i += 1) {
      await salvaControllo(
        costruisciControlloSalvato(gruppiPieni[i], {
          id: `s${i}`,
          generato: '2026-06-28T00:00:00Z',
        }),
      );
    }
    const letti = await caricaTuttiControlli();
    expect(letti).toHaveLength(3);
    const rckEff = letti.map((c) => c.rckEffettiva);
    expect(new Set(rckEff).size).toBe(3); // tre valori DISTINTI, non tutti uguali
  });

  it('P1+P3 idempotenza: salvare 2 volte lo STESSO gruppo (stesso id) → resta 1 voce', async () => {
    const c = costruisciControlloSalvato(gruppiPieni[0], {
      id: 'fisso',
      generato: '2026-06-28T00:00:00Z',
    });
    await salvaControllo(c);
    await salvaControllo(c); // doppio clic / re-save
    const letti = await caricaTuttiControlli();
    expect(letti).toHaveLength(1); // niente doppione (chiave = id gruppo)
  });
});
