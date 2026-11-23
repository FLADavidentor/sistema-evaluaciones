import { describe, expect, it } from 'vitest';
import { crearCatalogoMock, type EscenarioCatalogo } from './catalogo.mock';
import { ApiError } from './http';

const cliente = (escenario?: EscenarioCatalogo) => crearCatalogoMock({ retardoMs: 0, escenario });

describe('mock del catálogo (E1 y E2, DOC-05)', () => {
  it('E1 lista BFA con su número de subpruebas', async () => {
    const tests = await cliente().listarTests();
    expect(tests[0]).toEqual({
      id: 1,
      codigo: 'BFA',
      nombre: 'Batería Factorial de Aptitudes',
      numeroSubpruebas: 13,
    });
  });

  it('E1 incluye un test activo sin edición publicada', async () => {
    const tests = await cliente().listarTests();
    expect(tests.map((t) => t.id)).toEqual([1, 2]);
  });

  it('E1 responde lista vacía en el escenario "vacio"', async () => {
    await expect(cliente('vacio').listarTests()).resolves.toEqual([]);
  });

  it.each([
    ['sin-permiso', 403, 'SIN_PERMISO'],
    ['error', 500, 'ERROR_INTERNO'],
  ] as const)('E1 en el escenario "%s" falla con %i %s', async (escenario, status, codigo) => {
    const error = await cliente(escenario)
      .listarTests()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, error: { codigo, ruta: '/api/v1/tests' } });
  });

  it('E1 en el escenario "sin-conexion" falla como fetch sin red', async () => {
    await expect(cliente('sin-conexion').listarTests()).rejects.toBeInstanceOf(TypeError);
  });

  it('E2 devuelve las 13 subpruebas del BFA en orden y no comparte estado entre llamadas', async () => {
    const c = cliente();
    const primero = await c.obtenerTest(1);
    expect(primero.subpruebas.map((s) => s.orden)).toEqual([...Array(13).keys()].map((i) => i + 1));
    primero.subpruebas.length = 0;
    await expect(c.obtenerTest(1)).resolves.toMatchObject({ subpruebas: expect.any(Array) });
    expect((await c.obtenerTest(1)).subpruebas).toHaveLength(13);
  });

  it('E2 responde 404 para el test sin edición publicada y para uno inexistente', async () => {
    for (const id of [2, 999]) {
      const error = await cliente()
        .obtenerTest(id)
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ status: 404, error: { codigo: 'TEST_NO_ENCONTRADO' } });
    }
  });

  it('E2 simula 403, 500 y fallo de conexión por testId', async () => {
    await expect(cliente().obtenerTest(403)).rejects.toMatchObject({ status: 403 });
    await expect(cliente().obtenerTest(500)).rejects.toMatchObject({ status: 500 });
    await expect(cliente().obtenerTest(503)).rejects.toBeInstanceOf(TypeError);
  });
});
