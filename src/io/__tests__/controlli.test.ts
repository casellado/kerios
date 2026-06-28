import 'fake-indexeddb/auto'; // deve precedere l'import di db.ts (IndexedDB simulato)
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRegistroClsCsv } from '../csv.ts';
import { costruisciControlloSalvato, raggruppa } from '../../domain/index.ts';
import { db } from '../db.ts';
import { salvaControllo, caricaTuttiControlli, svuotaControlli } from '../controlli.ts';

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
const GEN = '2026-06-28T00:00:00Z';

describe('costruisciControlloSalvato — SNAPSHOT fedele (no riferimenti condivisi)', () => {
  it('gruppi diversi → snapshot con valori DIVERSI (Rck eff, n, prelievi)', () => {
    const snap = gruppiPieni.map((pr) => costruisciControlloSalvato(pr, { generato: GEN }));
    expect(new Set(snap.map((c) => c.rckEffettiva)).size).toBe(snap.length);
    snap.forEach((c, i) => expect(c.prelieviIds).toEqual(gruppiPieni[i].map((p) => p.id)));
  });

  it('prelieviIds è una COPIA: mutare l’array di origine non tocca lo snapshot', () => {
    const origine = [...gruppiPieni[0]];
    const c = costruisciControlloSalvato(origine, { generato: GEN });
    const prima = [...c.prelieviIds];
    origine.push(gruppiPieni[1][0]);
    expect(c.prelieviIds).toEqual(prima);
  });

  it('gruppo n<3 → esito "incompleto"', () => {
    const c = costruisciControlloSalvato([gruppiPieni[0][0]], { generato: GEN });
    expect(c.n).toBe(1);
    expect(c.esito).toBe('incompleto');
  });

  it('la CHIAVE (id) deriva dal CONTENUTO ed è indipendente dall’ordine', () => {
    const a = costruisciControlloSalvato(gruppiPieni[0], { generato: GEN });
    const b = costruisciControlloSalvato([...gruppiPieni[0]].reverse(), { generato: GEN });
    expect(a.id).toBe(b.id); // stesso insieme → stessa chiave
    const c = costruisciControlloSalvato(gruppiPieni[1], { generato: GEN });
    expect(c.id).not.toBe(a.id); // insieme diverso → chiave diversa
  });
});

describe('round-trip IndexedDB: ogni controllo conserva i SUOI valori + idempotenza per CONTENUTO', () => {
  beforeEach(async () => {
    await db.controlliCls.clear();
  });

  it('salvo 3 controlli diversi e li rileggo con valori diversi', async () => {
    for (const pr of gruppiPieni)
      await salvaControllo(costruisciControlloSalvato(pr, { generato: GEN }));
    const letti = await caricaTuttiControlli();
    expect(letti).toHaveLength(3);
    expect(new Set(letti.map((c) => c.rckEffettiva)).size).toBe(3);
  });

  it('riclic: salvare 2 volte lo STESSO gruppo → resta 1 voce', async () => {
    const c = costruisciControlloSalvato(gruppiPieni[0], { generato: GEN });
    await salvaControllo(c);
    await salvaControllo(c);
    expect(await caricaTuttiControlli()).toHaveLength(1);
  });

  it('FIX 2: stesso insieme di prelievi via "gruppi diversi" (rigenerazione/ordine) → 1 voce', async () => {
    // simula due proposte distinte (es. dopo rigenerazione) sullo stesso insieme,
    // anche con ordine diverso: la chiave è per contenuto → 1 sola voce.
    await salvaControllo(costruisciControlloSalvato(gruppiPieni[0], { generato: GEN }));
    await salvaControllo(
      costruisciControlloSalvato([...gruppiPieni[0]].reverse(), { generato: GEN }),
    );
    expect(await caricaTuttiControlli()).toHaveLength(1);
  });

  it('FIX 3: svuotaControlli pulisce solo i controlli', async () => {
    await salvaControllo(costruisciControlloSalvato(gruppiPieni[0], { generato: GEN }));
    expect(await caricaTuttiControlli()).toHaveLength(1);
    await svuotaControlli();
    expect(await caricaTuttiControlli()).toHaveLength(0);
    // i prelievi importati non sono toccati da questo store
    expect(prelievi.length).toBe(22);
  });
});
