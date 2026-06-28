import 'fake-indexeddb/auto'; // deve precedere l'import di db.ts (IndexedDB simulato)
import { beforeEach, describe, expect, it } from 'vitest';
import type { ControlloSalvato, Prelievo } from '../../core/index.ts';
import {
  applicaProgettoACache,
  caricaProgettoDaCartella,
  costruisciProgetto,
  salvaProgettoSuCartella,
  serializzaProgetto,
  statoCacheCls,
  validaProgetto,
  SCHEMA_PROGETTO,
  FILE_PROGETTO,
} from '../progetto.ts';
import { leggiJson, type HandleCartella } from '../workspace.ts';
import { db } from '../db.ts';

const GEN = '2026-06-28T10:00:00Z';

function prelievo(id: string, rck = 40): Prelievo {
  return { id, verbale: id, data: '01/03/2026', wbs: 'ST11', parte: 'Pila', rck, mix: 'MX1' };
}
function controllo(id: string, prelieviIds: string[]): ControlloSalvato {
  return {
    id,
    wbs: 'ST11',
    tipo: 'A',
    rck: 40,
    prelieviIds,
    esito: 'conforme',
    n: prelieviIds.length,
    forzato: false,
    generato: GEN,
  };
}

// handle FITTIZIO minimo, in memoria
class FakeFile {
  readonly kind = 'file' as const;
  contenuto = '';
  constructor(public name: string) {}
  async getFile(): Promise<File> {
    const t = this.contenuto;
    return { text: async () => t } as unknown as File;
  }
  async createWritable() {
    return {
      write: async (d: string | BufferSource | Blob) => {
        this.contenuto = typeof d === 'string' ? d : '';
      },
      close: async () => {},
    };
  }
}
class FakeDir {
  readonly kind = 'directory' as const;
  files = new Map<string, FakeFile>();
  constructor(public name: string) {}
  async getDirectoryHandle(): Promise<never> {
    throw Object.assign(new Error('no'), { name: 'NotFoundError' });
  }
  async getFileHandle(nome: string, opts?: { create?: boolean }): Promise<FakeFile> {
    let f = this.files.get(nome);
    if (!f) {
      if (!opts?.create) throw Object.assign(new Error('no'), { name: 'NotFoundError' });
      f = new FakeFile(nome);
      this.files.set(nome, f);
    }
    return f;
  }
}
const asDir = (d: FakeDir) => d as unknown as HandleCartella;

describe('progetto — schema reale e validazione', () => {
  it('costruisciProgetto usa lo schema corrente e copia gli array (snapshot)', () => {
    const prelievi = [prelievo('p1')];
    const p = costruisciProgetto({
      commessa: 'C',
      prelievi,
      controlli: [],
      schede: [],
      aggiornato: GEN,
    });
    expect(p.schema).toBe(SCHEMA_PROGETTO);
    expect(p.creato).toBe(GEN); // default = aggiornato alla prima scrittura
    prelievi.push(prelievo('p2')); // muto l'origine
    expect(p.cls.prelievi).toHaveLength(1); // lo snapshot non cambia
  });

  it('validaProgetto rifiuta uno schema non riconosciuto', () => {
    expect(() => validaProgetto({ schema: 'altro/9' })).toThrow();
    expect(() => validaProgetto(null)).toThrow();
  });

  it('migrazione: vecchio campo "lettera" → "protRichiesta" (retro-compatibilità)', () => {
    const grezzo = {
      schema: SCHEMA_PROGETTO,
      commessa: 'C',
      cls: {
        prelievi: [{ ...prelievo('p1'), lettera: 'CDG-VECCHIO' }],
        controlli: [],
      },
    };
    const p = validaProgetto(grezzo);
    expect(p.cls.prelievi[0].protRichiesta).toBe('CDG-VECCHIO');
    expect((p.cls.prelievi[0] as { lettera?: string }).lettera).toBeUndefined();
  });

  it('serializza → valida è un round-trip fedele', () => {
    const p = costruisciProgetto({
      commessa: 'C',
      prelievi: [prelievo('p1')],
      controlli: [controllo('k1', ['p1'])],
      schede: [],
      aggiornato: GEN,
    });
    expect(validaProgetto(JSON.parse(serializzaProgetto(p)))).toEqual(p);
  });
});

describe('progetto — IO su cartella + ponte cache', () => {
  beforeEach(async () => {
    await db.prelieviCls.clear();
    await db.controlliCls.clear();
    await db.schedeExport.clear();
  });

  it('salva su cartella scrive progetto.kerios.json e si rilegge uguale', async () => {
    const dir = new FakeDir('Megalotto-3-SS106');
    const salvato = await salvaProgettoSuCartella(asDir(dir), {
      commessa: dir.name,
      prelievi: [prelievo('p1'), prelievo('p2')],
      controlli: [controllo('k1', ['p1', 'p2'])],
      schede: [],
      aggiornato: GEN,
    });
    // il file esiste col nome fisso
    const grezzo = await leggiJson<{ schema: string }>(asDir(dir), FILE_PROGETTO);
    expect(grezzo?.schema).toBe(SCHEMA_PROGETTO);
    // e si rilegge identico
    expect(await caricaProgettoDaCartella(asDir(dir))).toEqual(salvato);
  });

  it('caricaProgettoDaCartella → null se la commessa non ha ancora un progetto', async () => {
    expect(await caricaProgettoDaCartella(asDir(new FakeDir('nuova')))).toBeNull();
  });

  it('applicaProgettoACache RIGENERA la cache dal progetto (la verità vince)', async () => {
    // cache "stantia" iniziale
    await db.prelieviCls.put(prelievo('vecchio'));
    await db.controlliCls.put(controllo('vecchioK', ['vecchio']));
    const p = costruisciProgetto({
      commessa: 'C',
      prelievi: [prelievo('p1'), prelievo('p2'), prelievo('p3')],
      controlli: [controllo('k1', ['p1', 'p2', 'p3'])],
      schede: [],
      aggiornato: GEN,
    });
    await applicaProgettoACache(p);
    const stato = await statoCacheCls();
    // la cache vecchia è sostituita per intero da quella della cartella
    expect(stato.prelievi.map((x) => x.id).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(stato.controlli.map((x) => x.id)).toEqual(['k1']);
  });

  it('round-trip completo: cache → salva su cartella → svuota → riapri → ritrovo', async () => {
    await db.prelieviCls.bulkPut([prelievo('p1'), prelievo('p2')]);
    await db.controlliCls.put(controllo('k1', ['p1', 'p2']));
    const dir = new FakeDir('C');
    const { prelievi, controlli, schede } = await statoCacheCls();
    await salvaProgettoSuCartella(asDir(dir), {
      commessa: 'C',
      prelievi,
      controlli,
      schede,
      aggiornato: GEN,
    });
    // simulo chiusura: svuoto la cache
    await db.prelieviCls.clear();
    await db.controlliCls.clear();
    expect((await statoCacheCls()).prelievi).toHaveLength(0);
    // riapertura: eredito dalla cartella
    const riletto = await caricaProgettoDaCartella(asDir(dir));
    await applicaProgettoACache(riletto!);
    const dopo = await statoCacheCls();
    expect(dopo.prelievi.map((x) => x.id).sort()).toEqual(['p1', 'p2']);
    expect(dopo.controlli.map((x) => x.id)).toEqual(['k1']);
  });
});
