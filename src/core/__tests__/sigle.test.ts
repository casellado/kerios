import { describe, it, expect } from 'vitest';
import {
  parseSiglaImport,
  siglaToNomeFile,
  formattaSiglaVerbale,
  formattaSiglaCartellino,
  materialeDaVerbale,
  eVerbaleCls,
} from '../sigle.ts';

describe('materialeDaVerbale (discriminante dal prefisso)', () => {
  it('CLS → calcestruzzo (nuovo e storico)', () => {
    expect(materialeDaVerbale('CLS 5607')).toBe('cls');
    expect(materialeDaVerbale('CLS/12')).toBe('cls');
    expect(eVerbaleCls('CLS 5607')).toBe(true);
  });
  it('AC1 → acciaio (storico con trattino/zeri e nuovo)', () => {
    expect(materialeDaVerbale('AC1-0001')).toBe('acciaio');
    expect(materialeDaVerbale('AC1/1')).toBe('acciaio');
    expect(eVerbaleCls('AC1-0001')).toBe(false);
  });
  it('prefisso ignoto o stringa non interpretabile → sconosciuto', () => {
    expect(materialeDaVerbale('XYZ 1')).toBe('sconosciuto');
    expect(materialeDaVerbale('boh')).toBe('sconosciuto');
    expect(materialeDaVerbale('')).toBe('sconosciuto');
  });
});

describe('parseSiglaImport (riconosce nuovo e storico)', () => {
  it('storico con spazio: "CLS 5607"', () => {
    expect(parseSiglaImport('CLS 5607')).toEqual({
      prefisso: 'CLS',
      numero: 5607,
      display: 'CLS/5607',
    });
  });
  it('nuovo con slash: "CLS/12"', () => {
    expect(parseSiglaImport('CLS/12')).toEqual({ prefisso: 'CLS', numero: 12, display: 'CLS/12' });
  });
  it('storico acciaio con trattino e zeri: "AC1-0001" → 1', () => {
    expect(parseSiglaImport('AC1-0001')).toEqual({ prefisso: 'AC1', numero: 1, display: 'AC1/1' });
  });
  it('nuovo acciaio: "AC1/3"', () => {
    expect(parseSiglaImport('AC1/3')?.numero).toBe(3);
  });
  it('non interpretabile → null', () => {
    expect(parseSiglaImport('pippo')).toBeNull();
    expect(parseSiglaImport('')).toBeNull();
  });
});

describe('formattazione sigle', () => {
  it('verbale e cartellino con "/" e spazio', () => {
    expect(formattaSiglaVerbale('CLS', 7)).toBe('CLS/7');
    expect(formattaSiglaCartellino('CLS/7', 'A')).toBe('CLS/7 A');
  });
  it('nome-file: niente "/" né spazi', () => {
    expect(siglaToNomeFile('AC1/1 A')).toBe('AC1-1-A');
    expect(siglaToNomeFile('CLS/12')).toBe('CLS-12');
  });
});
