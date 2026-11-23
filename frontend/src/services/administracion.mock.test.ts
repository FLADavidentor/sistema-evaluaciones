import { describe, expect, it } from 'vitest';
import type { ClienteAdministracion } from '../features/administracion/tipos';
import { crearAdministracionMock } from './administracion.mock';
import { ApiError } from './http';

const nuevo = () => crearAdministracionMock({ retardoMs: 0 });
const falla = async (promesa: Promise<unknown>) => {
  const error = await promesa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return (error as ApiError).error!;
};
const config = { orden: 1, tiempoLimiteSegundos: 60, tipoRespuesta: 'SELECCION' as const };

async function borradorVacio(c: ClienteAdministracion) {
  return c.crearVersion(2);
}

describe('E1 y E2', () => {
  it('lista los tests y devuelve BFA', async () => {
    const c = nuevo();
    expect((await c.listarTests()).map((t) => t.codigo)).toEqual(['BFA', 'WEILL']);
    expect((await c.obtenerTest(1)).subpruebas).toHaveLength(13);
  });
});

describe('E25', () => {
  it('crea un borrador y rechaza un test inexistente', async () => {
    const c = nuevo();
    expect(await c.crearVersion(1)).toEqual({ id: 11, testId: 1, estado: 'BORRADOR' });
    expect((await falla(c.crearVersion(99))).codigo).toBe('TEST_NO_ENCONTRADO');
  });
});

describe('E26–E30 sobre versiones no editables', () => {
  it('la versión publicada responde 409 VERSION_NO_EDITABLE', async () => {
    const c = nuevo();
    expect((await falla(c.guardarConfiguracion(10, 'VOC1', config))).codigo).toBe(
      'VERSION_NO_EDITABLE',
    );
    expect((await falla(c.cargarClave(10, { entradas: [] }))).status).toBe(409);
    expect((await falla(c.publicar(10))).codigo).toBe('VERSION_NO_EDITABLE');
  });
});

describe('E26', () => {
  it('guarda y valida con detalles', async () => {
    const c = nuevo();
    const v = await c.crearVersion(1);
    await expect(c.guardarConfiguracion(v.id, 'VOC1', config)).resolves.toEqual(config);
    const error = await falla(c.guardarConfiguracion(v.id, 'VOC1', { ...config, orden: 0 }));
    expect(error).toMatchObject({ status: 400, codigo: 'SOLICITUD_INVALIDA' });
    expect(error.detalles?.[0]?.campo).toBe('orden');
    expect((await falla(c.guardarConfiguracion(v.id, 'XX', config))).status).toBe(400);
  });
});

describe('E27, E28 y E29', () => {
  it('agrega preguntas, rechaza duplicados y valida opciones y clave', async () => {
    const c = nuevo();
    const v = await c.crearVersion(1);
    const p = await c.agregarPregunta(v.id, 'VOC1', {
      numeroVisible: 2,
      ordenPresentacion: 2,
      enunciado: 'Ficticia',
    });
    expect(p.id).toBeGreaterThan(0);
    expect(
      (
        await falla(
          c.agregarPregunta(v.id, 'VOC1', {
            numeroVisible: 2,
            ordenPresentacion: 9,
            enunciado: 'x',
          }),
        )
      ).codigo,
    ).toBe('PREGUNTA_DUPLICADA');
    await c.guardarOpciones(v.id, p.id, {
      opciones: [
        { letra: 'A', texto: 'a' },
        { letra: 'B', texto: 'b' },
      ],
    });
    expect(
      (await falla(c.cargarClave(v.id, { entradas: [{ preguntaId: p.id, opcion: 'Z' }] }))).codigo,
    ).toBe('OPCION_NO_PERTENECE');
    await expect(
      c.cargarClave(v.id, { entradas: [{ preguntaId: p.id, opcion: 'B' }] }),
    ).resolves.toHaveProperty('idClave');
  });
});

describe('E30', () => {
  const rango = (percentil: number, inf: number, sup: number) => ({
    idFactor: 'F1',
    percentil,
    limiteInferior: inf,
    limiteSuperior: sup,
    estadoCelda: 'RANGO' as const,
  });
  const baremo = (rangos: ReturnType<typeof rango>[]) => ({
    nombre: 'B',
    version: '1',
    anioNorma: 2000,
    rangos,
  });

  it('carga rangos disjuntos y rechaza superpuestos', async () => {
    const c = nuevo();
    await expect(
      c.cargarBaremo(baremo([rango(10, 0, 4), rango(20, 5, 9)])),
    ).resolves.toHaveProperty('idBaremo');
    expect((await falla(c.cargarBaremo(baremo([rango(10, 0, 5), rango(20, 5, 9)])))).codigo).toBe(
      'BAREMO_INVALIDO',
    );
    expect((await falla(c.cargarBaremo({ ...baremo([]), nombre: '' }))).status).toBe(400);
  });
});

describe('E31', () => {
  it('publica el borrador copiado y retira la versión anterior', async () => {
    const c = nuevo();
    const v = await c.crearVersion(1);
    await expect(c.publicar(v.id)).resolves.toEqual({ id: v.id, testId: 1, estado: 'PUBLICADA' });
    expect((await falla(c.publicar(v.id))).codigo).toBe('VERSION_NO_EDITABLE');
  });

  it('un borrador vacío responde 422 VERSION_INCOMPLETA con lo que falta', async () => {
    const c = nuevo();
    const v = await borradorVacio(c);
    const error = await falla(c.publicar(v.id));
    expect(error).toMatchObject({ status: 422, codigo: 'VERSION_INCOMPLETA' });
    expect(error.mensaje).toContain('subpruebas');
  });

  it('una pregunta sin clave impide publicar', async () => {
    const c = nuevo();
    const v = await c.crearVersion(1);
    await c.agregarPregunta(v.id, 'VOC1', {
      numeroVisible: 9,
      ordenPresentacion: 9,
      enunciado: 'Ficticia',
    });
    expect((await falla(c.publicar(v.id))).mensaje).toContain('sin opciones');
  });

  it('versión inexistente y escenarios de error por id', async () => {
    const c = nuevo();
    expect((await falla(c.publicar(77))).status).toBe(404);
    expect((await falla(c.publicar(403))).codigo).toBe('SIN_PERMISO');
    expect((await falla(c.publicar(500))).codigo).toBe('ERROR_INTERNO');
  });
});
