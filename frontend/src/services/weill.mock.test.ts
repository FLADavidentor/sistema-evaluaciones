import { describe, expect, it } from 'vitest';
import { crearClienteWeillMock, materialItem, type AlmacenWeill } from './weill.mock';
import { servicioWeill } from './weill';

const almacenEnMemoria = (): AlmacenWeill => {
  const datos = new Map<string, string>();
  return {
    getItem: (c) => datos.get(c) ?? null,
    setItem: (c, v) => void datos.set(c, v),
  };
};

const cliente = (almacen = almacenEnMemoria()) => crearClienteWeillMock({ retardoMs: 0, almacen });

describe('mock de Weill', () => {
  it('inicia un intento EN_CURSO de la Forma A sin límite y con retroceso', async () => {
    await expect(cliente().iniciarIntento()).resolves.toMatchObject({
      forma: 'A',
      estado: 'EN_CURSO',
      finLimite: null,
      permitirRetroceso: true,
      respuestas: {},
    });
  });

  it('elegir otra pieza reemplaza y quitar deja el ítem pendiente', async () => {
    const c = cliente();
    const { id } = await c.iniciarIntento();
    await c.guardarRespuesta(id, 5, 3);
    await c.guardarRespuesta(id, 5, 7);
    expect((await c.obtenerIntento(id)).respuestas).toEqual({ 5: 7 });
    await c.guardarRespuesta(id, 5, null);
    expect((await c.obtenerIntento(id)).respuestas).toEqual({});
  });

  it('rechaza ítems y piezas fuera de rango', async () => {
    const c = cliente();
    const { id } = await c.iniciarIntento();
    await expect(c.guardarRespuesta(id, 61, 1)).rejects.toMatchObject({ status: 400 });
    await expect(c.guardarRespuesta(id, 1, 9)).rejects.toMatchObject({ status: 400 });
  });

  it('retoma el intento EN_CURSO con sus respuestas tras recargar', async () => {
    const almacen = almacenEnMemoria();
    const antes = cliente(almacen);
    const { id } = await antes.iniciarIntento();
    await antes.guardarRespuesta(id, 13, 2);
    const despues = cliente(almacen);
    await expect(despues.obtenerIntentoEnCurso()).resolves.toMatchObject({
      id,
      respuestas: { 13: 2 },
    });
    await expect(despues.iniciarIntento()).rejects.toMatchObject({ status: 409 });
  });

  it('finaliza con omitidos y bloquea las respuestas', async () => {
    const c = cliente();
    const { id } = await c.iniciarIntento();
    await c.guardarRespuesta(id, 1, 4);
    await expect(c.finalizarIntento(id)).resolves.toMatchObject({ respondidos: 1, omitidos: 59 });
    await expect(c.guardarRespuesta(id, 2, 1)).rejects.toMatchObject({
      status: 409,
      error: { codigo: 'INTENTO_FINALIZADO' },
    });
    await expect(c.obtenerIntentoEnCurso()).resolves.toBeNull();
  });

  it('el resultado queda PENDIENTE_VALIDACION sin valores calculados', async () => {
    const c = cliente();
    const { id } = await c.iniciarIntento();
    await expect(c.obtenerResultado(id)).rejects.toMatchObject({ status: 409 });
    await c.finalizarIntento(id);
    const resultado = await c.obtenerResultado(id);
    expect(resultado).toMatchObject({
      estado: 'PENDIENTE_VALIDACION',
      puntajeDirecto: null,
      ci: null,
    });
    expect(resultado.subtotales).toHaveLength(5);
    expect(resultado.subtotales.every((s) => s.puntaje === null)).toBe(true);
  });

  it('simula un fallo de guardado para reintentar', async () => {
    const c = crearClienteWeillMock({
      retardoMs: 0,
      almacen: almacenEnMemoria(),
      fallaGuardado: (orden) => orden === 2,
    });
    const { id } = await c.iniciarIntento();
    await expect(c.guardarRespuesta(id, 2, 1)).rejects.toBeInstanceOf(TypeError);
  });

  it('funciona sin almacenamiento disponible', async () => {
    const c = crearClienteWeillMock({ retardoMs: 0, almacen: null });
    const { id } = await c.iniciarIntento();
    await expect(c.obtenerIntento(id)).resolves.toMatchObject({ id });
  });
});

describe('adaptador real de Weill', () => {
  it('falla hasta que DOC-09 defina el contrato', async () => {
    await expect(servicioWeill.iniciarIntento()).rejects.toThrow('pendiente de contrato DOC-09');
  });

  it('el material baraja las 8 piezas por ítem y apunta a los archivos', () => {
    const m = materialItem(7);
    expect(m.figuraUrl).toBe('/material/weill/07-figura.jpg');
    expect(m.piezas.map((p) => p.pieza)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(m.piezas.map((p) => p.url)).size).toBe(8);
    const primera = (o: number) =>
      materialItem(o).piezas.findIndex((p) => p.url.endsWith('-1.jpg'));
    expect(new Set(Array.from({ length: 60 }, (_, i) => primera(i + 1))).size).toBe(8);
  });

  it('obtenerItem valida el ítem', async () => {
    const c = cliente();
    const { id } = await c.iniciarIntento();
    await expect(c.obtenerItem(id, 3)).resolves.toMatchObject({ orden: 3 });
    await expect(c.obtenerItem(id, 61)).rejects.toMatchObject({ status: 400 });
  });
});
