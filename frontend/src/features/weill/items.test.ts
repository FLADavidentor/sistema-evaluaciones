import { describe, expect, it } from 'vitest';
import { contarRespondidos, esOrdenValido, ubicarItem } from './items';

describe('ubicación de ítems Weill', () => {
  it.each([
    [1, 1, 1],
    [12, 1, 12],
    [13, 2, 1],
    [30, 3, 6],
    [48, 4, 12],
    [60, 5, 12],
  ])('orden %i → lámina %i, posición %i', (orden, lamina, posicion) => {
    expect(ubicarItem(orden)).toEqual({ lamina, posicion });
  });

  it('solo acepta órdenes enteros de 1 a 60', () => {
    expect([0, 1, 60, 61, 1.5].map(esOrdenValido)).toEqual([false, true, true, false, false]);
  });

  it('cuenta las respuestas guardadas', () => {
    expect(contarRespondidos({ 1: 3, 7: 8 })).toBe(2);
  });
});
