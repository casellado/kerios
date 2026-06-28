import { describe, expect, it } from 'vitest';
import { caricaProfilo, salvaProfilo } from '../profilo.ts';
import { SCHEMA_PROFILO } from '../../core/index.ts';
import type { HandleCartella } from '../workspace.ts';

// cartella fittizia minima (in memoria)
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

describe('profilo commessa — intestazione testo libero', () => {
  it('salva e rilegge l’intestazione (round-trip, rispetta gli a-capo)', async () => {
    const dir = new FakeDir('Megalotto-3');
    const intestazione = 'S.S. n. 106 "Jonica"\nLavori di costruzione del 3° Megalotto…';
    await salvaProfilo(asDir(dir), { schema: SCHEMA_PROFILO, commessa: dir.name, intestazione });
    const letto = await caricaProfilo(asDir(dir));
    expect(letto?.schema).toBe(SCHEMA_PROFILO);
    expect(letto?.commessa).toBe('Megalotto-3');
    expect(letto?.intestazione).toBe(intestazione);
  });

  it('profilo assente → null (commessa nuova/vecchia, nessun blocco)', async () => {
    expect(await caricaProfilo(asDir(new FakeDir('vuota')))).toBeNull();
  });

  it('migrazione: profilo senza intestazione → intestazione undefined (vuota in UI)', async () => {
    const dir = new FakeDir('C');
    // profilo "vecchio" guscio: solo schema+commessa
    const fh = await dir.getFileHandle('profilo-commessa.json', { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify({ schema: SCHEMA_PROFILO, commessa: 'C' }));
    await w.close();
    const letto = await caricaProfilo(asDir(dir));
    expect(letto?.intestazione).toBeUndefined();
  });
});
