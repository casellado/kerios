import { describe, expect, it } from 'vitest';
import { apriDocCls, collegaDocCls, presenzaDocCls, sottocartellaDi } from '../documenti.ts';
import type { HandleCartella } from '../workspace.ts';

// --- Cartella FITTIZIA in memoria (con sottocartelle + keys()) -------------
function nf(): Error {
  const e = new Error('non trovato');
  e.name = 'NotFoundError';
  return e;
}
class FakeFile {
  readonly kind = 'file' as const;
  data: Blob | string = '';
  constructor(public name: string) {}
  async getFile(): Promise<File> {
    if (this.data instanceof Blob) return this.data as File;
    const d = this.data;
    return { text: async () => String(d) } as unknown as File;
  }
  async createWritable() {
    return {
      write: async (d: string | BufferSource | Blob) => {
        this.data = d instanceof Blob || typeof d === 'string' ? d : '';
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
  async getDirectoryHandle(n: string, opts?: { create?: boolean }): Promise<FakeDir> {
    let d = this.dirs.get(n);
    if (!d) {
      if (!opts?.create) throw nf();
      d = new FakeDir(n);
      this.dirs.set(n, d);
    }
    return d;
  }
  async getFileHandle(n: string, opts?: { create?: boolean }): Promise<FakeFile> {
    let f = this.files.get(n);
    if (!f) {
      if (!opts?.create) throw nf();
      f = new FakeFile(n);
      this.files.set(n, f);
    }
    return f;
  }
  async *keys(): AsyncIterableIterator<string> {
    for (const k of this.files.keys()) yield k;
    for (const k of this.dirs.keys()) yield k;
  }
}
const asDir = (d: FakeDir) => d as unknown as HandleCartella;
const pdf = () => new File(['contenuto certificato'], 'cert.pdf', { type: 'application/pdf' });

describe('documenti — collega per NOME-FILE nella cartella nota', () => {
  it('certificato/verbale → pdf/, ddt → allegati/ (sottocartella per tipo)', () => {
    expect(sottocartellaDi('certificato')).toBe('pdf');
    expect(sottocartellaDi('verbale')).toBe('pdf');
    expect(sottocartellaDi('ddt')).toBe('allegati');
  });

  it('collega copia il file in calcestruzzo/<WBS>/pdf e ritorna il nome', async () => {
    const commessa = new FakeDir('Megalotto-3');
    const nome = await collegaDocCls(asDir(commessa), 'ST11', 'certificato', pdf());
    expect(nome).toBe('cert.pdf');
    // il file è davvero dentro calcestruzzo/ST11/pdf
    const dir = commessa.dirs.get('calcestruzzo')?.dirs.get('ST11')?.dirs.get('pdf');
    expect(dir?.files.has('cert.pdf')).toBe(true);
  });

  it('apri ritrova il file collegato (round-trip dei byte)', async () => {
    const commessa = new FakeDir('C');
    await collegaDocCls(asDir(commessa), 'ST11', 'certificato', pdf());
    const file = await apriDocCls(asDir(commessa), 'ST11', 'certificato', 'cert.pdf');
    expect(file).not.toBeNull();
    expect(await file!.text()).toBe('contenuto certificato');
  });

  it('apri → null se il file non è (più) nella cartella (degrado, niente crash)', async () => {
    const commessa = new FakeDir('C');
    await collegaDocCls(asDir(commessa), 'ST11', 'certificato', pdf());
    // un nome diverso = file spostato/rinominato fuori da Kerios
    expect(await apriDocCls(asDir(commessa), 'ST11', 'certificato', 'altro.pdf')).toBeNull();
    // e una WBS senza struttura non lancia
    expect(await apriDocCls(asDir(commessa), 'ST99', 'certificato', 'x.pdf')).toBeNull();
  });

  it('presenza elenca i file presenti per sottocartella (pdf vs allegati)', async () => {
    const commessa = new FakeDir('C');
    await collegaDocCls(asDir(commessa), 'ST11', 'certificato', pdf());
    await collegaDocCls(
      asDir(commessa),
      'ST11',
      'ddt',
      new File(['ddt'], 'ddt-123.pdf', { type: 'application/pdf' }),
    );
    const pres = await presenzaDocCls(asDir(commessa), 'ST11');
    expect(pres.pdf.has('cert.pdf')).toBe(true);
    expect(pres.allegati.has('ddt-123.pdf')).toBe(true);
    expect(pres.pdf.has('ddt-123.pdf')).toBe(false); // ddt non è in pdf/
  });

  it('presenza su WBS senza struttura → insiemi vuoti (non lancia)', async () => {
    const pres = await presenzaDocCls(asDir(new FakeDir('vuota')), 'ST00');
    expect(pres.pdf.size).toBe(0);
    expect(pres.allegati.size).toBe(0);
  });
});
