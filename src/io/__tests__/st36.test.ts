import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Prelievo } from '../../core/index.ts';
import { decodeCp1252 } from '../csv.ts';
import { parseNumeroIt } from '../formato.ts';
import { raggruppa, calcolaControllo, controlloTipoA } from '../../domain/index.ts';

/**
 * VERIFICA CHIAVE (collaudo PO): Kerios deve COINCIDERE con l'Excel ST36 del PO.
 * Si importano le 16 righe reali del documento ST36 (TOMBINO SCATOLARE TO59),
 * si raggruppa auto-posizionale e si confrontano le Rck effettive terzina per
 * terzina con quelle scritte nel file dal PO.
 */
const ST36 = fileURLToPath(
  new URL('../../../reference/dati-reali/ST36_Controllo_accettazione_cls_1_.csv', import.meta.url),
);

// Colonne ST36: 0 Data;1 Rck;2 Verbale;3 Ubicazione;4 Denom.;5 -;6 Cert;7 DataProva;8 Rott;9 R1;10 R2;...
function leggiST36(): Prelievo[] {
  const testo = decodeCp1252(new Uint8Array(readFileSync(ST36)));
  const out: Prelievo[] = [];
  for (const riga of testo.split(/\r?\n/)) {
    const c = riga.split(';');
    if (!c[2]?.startsWith('CLS')) continue; // solo righe prelievo
    const p: Prelievo = {
      id: c[2].trim(),
      verbale: c[2].trim(),
      data: c[0].trim(),
      wbs: 'TO59',
      parte: `${c[3]} ${c[4]}`.trim(),
      rck: parseNumeroIt(c[1]) ?? Number.NaN,
      mix: '',
      certificato: c[6]?.trim() || 'X',
    };
    const r1 = parseNumeroIt(c[9]);
    const r2 = parseNumeroIt(c[10]);
    const dp = c[7]?.trim();
    if (r1 != null) p.r1 = r1;
    if (r2 != null) p.r2 = r2;
    if (dp) p.dataProva = dp;
    out.push(p);
  }
  return out;
}

const prelievi = leggiST36();

describe('VERIFICA ST36 — coincidenza con l’Excel del PO', () => {
  it('legge 16 prelievi dal documento ST36', () => {
    expect(prelievi).toHaveLength(16);
  });

  it('auto-posizionale: 6 gruppi (5 terzine + 1 resto)', () => {
    const gruppi = raggruppa(prelievi, 'auto');
    expect(gruppi.map((g) => g.prelieviIds.length)).toEqual([3, 3, 3, 3, 3, 1]);
  });

  it('Rck effettive identiche all’Excel ST36 (incl. il caso 54,57)', () => {
    const gruppi = raggruppa(prelievi, 'auto');
    const byId = new Map(prelievi.map((p) => [p.id, p]));
    const rckEff = gruppi.map((g) => {
      const pr = g.prelieviIds.map((id) => byId.get(id)!);
      return calcolaControllo(pr).risultato.rckEffettiva;
    });
    // valori scritti dal PO nel file ST36, riga per riga
    expect(rckEff).toEqual([54.57, 49.43, 47.17, 50.73, 50.8, 51.05]);
  });

  it('la prima terzina (9159·9314·9406) è CONFORME per Rck 40', () => {
    const g1 = prelievi.slice(0, 3);
    const r = calcolaControllo(g1).risultato;
    expect(r.tipo).toBe('A');
    expect(r.rckEffettiva).toBe(54.57);
    expect(r.conforme).toBe(true);
  });

  it('controprova del "no": con Rck di progetto 55, la stessa terzina è BOCCIATA', () => {
    // Rck eff 54,57 < 55 → NON conforme. Verifica che Kerios sappia rifiutare.
    const g1 = prelievi.slice(0, 3).map((p) => ({ ...p, rck: 55 }));
    const r = controlloTipoA(g1);
    expect(r.rckEffettiva).toBe(54.57);
    expect(r.conforme).toBe(false);
  });
});
