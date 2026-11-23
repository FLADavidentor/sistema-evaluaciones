import { describe, expect, it } from 'vitest';
import { filasResultado, mostrar } from './resultado';
import type { ResultadoWeill } from './tipos';

const pendiente: ResultadoWeill = {
  intentoId: 1,
  estado: 'PENDIENTE_VALIDACION',
  puntajeDirecto: null,
  subtotales: [1, 2, 3, 4, 5].map((lamina) => ({ lamina, puntaje: null })),
  grupoBaremo: null,
  percentil: null,
  ci: null,
  categoria: null,
  versionClave: null,
  versionBaremo: null,
};

describe('vista del resultado Weill', () => {
  it('muestra «no calculado» para los nulos y el 0 como valor', () => {
    expect(mostrar(null)).toBe('no calculado');
    expect(mostrar(0)).toBe('0');
  });

  it('lista directo, 5 subtotales, baremo, percentil, CI, categoría y versiones', () => {
    const filas = filasResultado(pendiente);
    expect(filas).toHaveLength(12);
    expect(filas.every(([, valor]) => valor === 'no calculado')).toBe(true);
  });
});
