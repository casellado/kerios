import { describe, it, expect } from 'vitest';
import { media, scartoQuadraticoMedio, arrotonda } from '../stats.ts';

describe('media', () => {
  it('media aritmetica', () => {
    expect(media([37, 35, 36])).toBe(36);
  });
  it('array vuoto → NaN', () => {
    expect(media([])).toBeNaN();
  });
});

describe('scartoQuadraticoMedio (denominatore n−1)', () => {
  it('[50,52,54] → 2', () => {
    expect(scartoQuadraticoMedio([50, 52, 54])).toBeCloseTo(2, 10);
  });
  it('[37,35,36] → 1', () => {
    expect(scartoQuadraticoMedio([37, 35, 36])).toBeCloseTo(1, 10);
  });
  it('usa n−1, NON n (popolazione)', () => {
    // dataset noto: sample sd = 2,138 ; population sd = 2,000.
    const s = scartoQuadraticoMedio([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s).toBeCloseTo(2.138, 3); // campionario (n−1)
    expect(s).not.toBeCloseTo(2.0, 3); // NON popolazione
  });
  it('n < 2 → NaN (varianza campionaria non definita)', () => {
    expect(scartoQuadraticoMedio([42])).toBeNaN();
    expect(scartoQuadraticoMedio([])).toBeNaN();
  });
});

describe('arrotonda', () => {
  it('2 decimali', () => {
    expect(arrotonda(15.30612, 2)).toBe(15.31);
    expect(arrotonda(54.5666, 2)).toBe(54.57);
  });
  it('neutralizza il trap 0,2·100', () => {
    expect(arrotonda((8 / 40) * 100, 2)).toBe(20);
  });
});
