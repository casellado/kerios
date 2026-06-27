import { describe, it, expect } from 'vitest';
import { DOMAIN_PRONTO_PER_M1 } from '../index.ts';
import { SCHEMA_VERSION } from '../../core/index.ts';

/**
 * Test SANITY di M0: NON è un test NTC (quelli arrivano in M1). Serve solo a
 * dimostrare che l'harness Vitest gira, che il dominio è importabile in
 * isolamento (TS puro, senza DOM) e che il contratto è raggiungibile da core/.
 */
describe('sanity M0', () => {
  it('il modulo dominio è caricabile in isolamento', () => {
    expect(DOMAIN_PRONTO_PER_M1).toBe(true);
  });

  it('il contratto JSON espone la versione di schema', () => {
    expect(SCHEMA_VERSION).toBe('1.0');
  });
});
