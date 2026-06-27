import { describe, it, expect } from 'vitest';
import {
  parseSiglaImport,
  siglaToNomeFile,
  formattaSiglaVerbale,
  formattaSiglaCartellino,
} from '../sigle.ts';

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
