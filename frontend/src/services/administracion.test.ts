import { afterEach, describe, expect, it, vi } from 'vitest';
import { servicioAdministracion } from './administracion';

const responder = (status: number, cuerpo: unknown) => {
  const simulado = vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }));
  vi.stubGlobal('fetch', simulado);
  return simulado;
};

afterEach(() => vi.unstubAllGlobals());

describe('servicioAdministracion (llamadas reales)', () => {
  it.each([
    ['E25', () => servicioAdministracion.crearVersion(1), 'POST', '/api/v1/tests/1/versiones'],
    [
      'E26',
      () => servicioAdministracion.guardarConfiguracion(11, 'VOC1', {}),
      'PUT',
      '/api/v1/versiones/11/configuraciones/VOC1',
    ],
    [
      'E27',
      () =>
        servicioAdministracion.agregarPregunta(11, 'VOC1', {
          numeroVisible: 1,
          ordenPresentacion: 1,
          enunciado: 'x',
        }),
      'POST',
      '/api/v1/versiones/11/configuraciones/VOC1/preguntas',
    ],
    [
      'E28',
      () => servicioAdministracion.guardarOpciones(11, 120, { opciones: [] }),
      'PUT',
      '/api/v1/versiones/11/preguntas/120/opciones',
    ],
    [
      'E29',
      () => servicioAdministracion.cargarClave(11, { entradas: [] }),
      'PUT',
      '/api/v1/versiones/11/clave',
    ],
    [
      'E30',
      () =>
        servicioAdministracion.cargarBaremo({
          nombre: 'B',
          version: '1',
          anioNorma: 2000,
          rangos: [],
        }),
      'POST',
      '/api/v1/baremos',
    ],
    ['E31', () => servicioAdministracion.publicar(11), 'POST', '/api/v1/versiones/11/publicar'],
  ])('%s usa método y ruta de DOC-05', async (_nombre, llamar, metodo, ruta) => {
    const fetchSimulado = responder(200, {});
    await llamar();
    expect(fetchSimulado).toHaveBeenCalledWith(ruta, expect.objectContaining({ method: metodo }));
  });

  it('E25 y E31 van sin cuerpo; E26 envía el JSON', async () => {
    const fetchSimulado = responder(200, {});
    await servicioAdministracion.publicar(11);
    expect(fetchSimulado.mock.calls[0]?.[1]).not.toHaveProperty('body');
    await servicioAdministracion.guardarConfiguracion(11, 'VOC1', { orden: 1 });
    expect(fetchSimulado.mock.calls[1]?.[1]).toHaveProperty('body', '{"orden":1}');
  });

  it('propaga el error del backend con su código', async () => {
    responder(422, { status: 422, codigo: 'VERSION_INCOMPLETA', mensaje: 'Falta clave.' });
    await expect(servicioAdministracion.publicar(11)).rejects.toMatchObject({
      status: 422,
      error: { codigo: 'VERSION_INCOMPLETA' },
    });
  });
});
