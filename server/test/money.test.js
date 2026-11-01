import { describe, it, expect } from 'vitest';
import { equalSplit, resolveSplit, simplifyDebts } from '../src/services/money.js';

describe('equalSplit', () => {
  it('reparte el resto de céntimos y suma exacto', () => {
    const r = equalSplit(1000, ['a', 'b', 'c']);
    expect(r.map((x) => x.cents)).toEqual([334, 333, 333]);
    expect(r.reduce((s, x) => s + x.cents, 0)).toBe(1000);
  });
});

describe('resolveSplit', () => {
  const members = ['a', 'b', 'c'];
  it('por defecto reparte entre todos', () => {
    expect(resolveSplit(undefined, 900, members)).toHaveLength(3);
  });
  it('rechaza a quien no es miembro', () => {
    expect(() => resolveSplit({ mode: 'equal', members: ['x'] }, 100, members)).toThrow();
  });
  it('custom debe sumar el total', () => {
    expect(() => resolveSplit({ mode: 'custom', shares: [{ userId: 'a', amount: 5 }] }, 1000, members)).toThrow();
    const ok = resolveSplit({ mode: 'custom', shares: [{ userId: 'a', amount: 4 }, { userId: 'b', amount: 6 }] }, 1000, members);
    expect(ok.map((s) => s.cents)).toEqual([400, 600]);
  });
});

describe('simplifyDebts', () => {
  it('liquida con el mínimo de transferencias', () => {
    // A pagó 90 para tres (30 c/u): A +60, B -30, C -30
    const t = simplifyDebts({ A: 6000, B: -3000, C: -3000 });
    expect(t).toEqual([
      { from: 'B', to: 'A', cents: 3000 },
      { from: 'C', to: 'A', cents: 3000 },
    ]);
  });
  it('encadena deudas cruzadas', () => {
    const t = simplifyDebts({ A: 5000, B: 1000, C: -6000 });
    expect(t.reduce((s, x) => s + x.cents, 0)).toBe(6000);
    expect(t.every((x) => x.from === 'C')).toBe(true);
  });
  it('sin deudas no devuelve nada', () => {
    expect(simplifyDebts({ A: 0, B: 0 })).toEqual([]);
  });
});
