import { describe, expect, it } from 'vitest';
import {
  assicuraPermesso,
  creaStruttura,
  leggiJson,
  scriviJson,
  verificaStruttura,
  type HandleCartella,
  type StatoPermesso,
} from '../workspace.ts';

// --- Handle FITTIZIO in memoria (lo strato logico lavora su handle-like, così
//     è testabile in node senza DOM). Riproduce solo ciò che serve. ---
function notFound(): Error {
  const e = new Error('non trovato');
  e.name = 'NotFoundError';
  return e;
}

class FakeFile {
  readonly kind = 'file' as const;
  contenuto = '';
  constructor(public name: string) {}
  async getFile(): Promise<File> {
    const testo = this.contenuto;
    return { text: async () => testo } as unknown as File;
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
  dirs = new Map<string, FakeDir>();
  files = new Map<string, FakeFile>();
  constructor(public name: string) {}
  async getDirectoryHandle(nome: string, opts?: { create?: boolean }): Promise<FakeDir> {
    let d = this.dirs.get(nome);
    if (!d) {
      if (!opts?.create) throw notFound();
      d = new FakeDir(nome);
      this.dirs.set(nome, d);
    }
    return d;
  }
  async getFileHandle(nome: string, opts?: { create?: boolean }): Promise<FakeFile> {
    let f = this.files.get(nome);
    if (!f) {
      if (!opts?.create) throw notFound();
      f = new FakeFile(nome);
      this.files.set(nome, f);
    }
    return f;
  }
}

const asDir = (d: FakeDir) => d as unknown as HandleCartella;

describe('workspace — struttura cartelle commessa', () => {
  it('verificaStruttura segnala cosa manca su una cartella vuota', async () => {
    const dir = new FakeDir('Megalotto-3-SS106');
    const esito = await verificaStruttura(asDir(dir));
    expect(esito.completa).toBe(false);
    expect(esito.mancano).toEqual(['calcestruzzo/', 'acciaio/', 'profilo-commessa.json']);
  });

  it('creaStruttura crea i materiali + il profilo → poi è completa (idempotente)', async () => {
    const dir = new FakeDir('Megalotto-3-SS106');
    await creaStruttura(asDir(dir));
    const esito = await verificaStruttura(asDir(dir));
    expect(esito.completa).toBe(true);
    expect(esito.mancano).toEqual([]);
    // il profilo minimo riporta il nome della commessa
    const profilo = await leggiJson<{ commessa: string }>(asDir(dir), 'profilo-commessa.json');
    expect(profilo?.commessa).toBe('Megalotto-3-SS106');
    // ri-eseguire non rompe nulla
    await creaStruttura(asDir(dir));
    expect((await verificaStruttura(asDir(dir))).completa).toBe(true);
  });
});

describe('workspace — JSON su cartella (round-trip atomico)', () => {
  it('scriviJson poi leggiJson restituisce gli stessi dati', async () => {
    const dir = new FakeDir('c');
    await scriviJson(asDir(dir), 'dati.json', { a: 1, b: ['x', 'y'] });
    const letto = await leggiJson<{ a: number; b: string[] }>(asDir(dir), 'dati.json');
    expect(letto).toEqual({ a: 1, b: ['x', 'y'] });
  });

  it('leggiJson su file assente → null (non lancia)', async () => {
    const dir = new FakeDir('c');
    expect(await leggiJson(asDir(dir), 'manca.json')).toBeNull();
  });
});

describe('workspace — permessi su gesto utente', () => {
  function handleConPermesso(query: StatoPermesso, request: StatoPermesso): HandleCartella {
    return {
      name: 'h',
      kind: 'directory',
      getDirectoryHandle: async () => {
        throw notFound();
      },
      getFileHandle: async () => {
        throw notFound();
      },
      queryPermission: async () => query,
      requestPermission: async () => request,
    } as unknown as HandleCartella;
  }

  it('già granted → true senza chiedere', async () => {
    expect(await assicuraPermesso(handleConPermesso('granted', 'denied'))).toBe(true);
  });
  it('prompt → request granted → true', async () => {
    expect(await assicuraPermesso(handleConPermesso('prompt', 'granted'))).toBe(true);
  });
  it('prompt → request denied → false', async () => {
    expect(await assicuraPermesso(handleConPermesso('prompt', 'denied'))).toBe(false);
  });
});
