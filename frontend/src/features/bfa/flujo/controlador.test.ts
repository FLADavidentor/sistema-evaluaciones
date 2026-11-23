import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/http';
import type { BfaApi } from '../api/bfaApi';
import { BfaApiSimulada, type OpcionesApiSimulada } from '../api/bfaApiSimulada';
import { ControladorBfa, type EstadoEjecucion } from './controlador';

// Reloj controlable: el servidor simulado y el controlador comparten el mismo.
let ahoraMs = 0;
const ahora = () => ahoraMs;
const avanzar = (segundos: number) => {
  ahoraMs += segundos * 1000;
};
const dejarResolver = () => vi.advanceTimersByTimeAsync(0);

async function evaluacionNueva(opciones: OpcionesApiSimulada = {}, subpruebas?: string[]) {
  const api = new BfaApiSimulada({ ahora, ...opciones });
  const e = await api.iniciarEvaluacion({
    versionFormularioId: 10,
    sujetoId: 25,
    periodoId: 3,
    fluidez: { letraInicial: 'M' },
    ...(subpruebas ? { subpruebas } : {}),
  });
  return { api, id: e.id };
}

const nuevo = (api: BfaApi, id: number) =>
  new ControladorBfa(api, id, { ahora, esperaGuardadoMs: 100, intervaloSondeoMs: 1000 });

async function cargado(api: BfaApi, id: number) {
  const c = nuevo(api, id);
  await c.cargar();
  return c;
}

const fase = (c: ControladorBfa) => c.obtenerEstado().fase;
const ejecucion = (c: ControladorBfa) => c.obtenerEstado() as EstadoEjecucion;

/** Instrucciones → práctica → inicio de la subprueba. */
async function entrar(c: ControladorBfa) {
  c.continuar();
  c.continuar();
  await dejarResolver();
}

/** Deja vencer la subprueba activa y avanza hasta la pantalla de transición confirmada. */
async function vencer(c: ControladorBfa, segundos: number) {
  avanzar(segundos);
  c.tick();
  await dejarResolver();
}

beforeEach(() => {
  ahoraMs = 1_000_000;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('orden y preparación', () => {
  it('empieza por la primera subprueba pendiente con instrucciones, sin tiempo corriendo', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    const e = c.obtenerEstado();
    expect(e).toMatchObject({ fase: 'preparacion', paso: 'instrucciones', posicion: 1, total: 13 });
    if (e.fase === 'preparacion') expect(e.subprueba.codigo).toBe('VOC1');
    expect((await api.obtenerEvaluacion(id)).subpruebaActiva).toBeNull();
  });

  it('muestra instrucciones y práctica antes de iniciar el tiempo oficial', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    c.continuar();
    expect(c.obtenerEstado()).toMatchObject({ fase: 'preparacion', paso: 'practica' });
    expect((await api.obtenerEvaluacion(id)).subpruebaActiva).toBeNull();
    c.continuar();
    await dejarResolver();
    expect(fase(c)).toBe('ejecucion');
    expect((await api.obtenerEvaluacion(id)).subpruebaActiva?.codigo).toBe('VOC1');
  });

  it('omite la práctica cuando la subprueba no la tiene', async () => {
    const { api, id } = await evaluacionNueva({ sinPractica: ['VOC1'] });
    const c = await cargado(api, id);
    c.continuar();
    await dejarResolver();
    expect(fase(c)).toBe('ejecucion');
  });

  it('respeta la aplicación parcial y el orden que manda el backend', async () => {
    const { api, id } = await evaluacionNueva({}, ['CV', 'VOC2']);
    const c = await cargado(api, id);
    const e = c.obtenerEstado();
    expect(e).toMatchObject({ fase: 'preparacion', posicion: 1, total: 2 });
    if (e.fase === 'preparacion') expect(e.subprueba.codigo).toBe('VOC2');
  });
});

describe('sin saltos ni regresos', () => {
  it('el servidor rechaza iniciar una subprueba fuera de orden', async () => {
    const { api, id } = await evaluacionNueva();
    await expect(api.iniciarSubprueba(id, 'CV')).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBA_FUERA_DE_ORDEN' },
    });
  });

  it('al cerrarse, ofrece solo la siguiente y la cerrada no se puede reabrir ni consultar', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    await entrar(c);
    await vencer(c, 300);
    const e = c.obtenerEstado();
    expect(e).toMatchObject({ fase: 'transicion', cerrando: false });
    if (e.fase === 'transicion') {
      expect(e.cerrada.codigo).toBe('VOC1');
      expect(e.siguiente?.codigo).toBe('VOC2');
    }
    await expect(api.iniciarSubprueba(id, 'VOC1')).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBA_CERRADA' },
    });
    await expect(api.obtenerPreguntas(id, 'VOC1')).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBA_NO_ACTIVA' },
    });
    c.continuar();
    await dejarResolver();
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'preparacion',
      paso: 'instrucciones',
      posicion: 2,
    });
  });

  it('terminar de responder antes no cierra la subprueba ni habilita la siguiente', async () => {
    const { api, id } = await evaluacionNueva({ preguntasPorSubprueba: 2 });
    const c = await cargado(api, id);
    await entrar(c);
    c.siguiente();
    c.siguiente();
    expect(ejecucion(c)).toMatchObject({ fase: 'ejecucion', alFinal: true });
    await expect(api.iniciarSubprueba(id, 'VOC2')).rejects.toMatchObject({
      error: { codigo: 'HAY_SUBPRUEBA_ACTIVA' },
    });
    c.revisar();
    expect(ejecucion(c).alFinal).toBe(false);
  });
});

describe('progreso y estados oficiales', () => {
  it('recorre todo el flujo hasta finalizar', async () => {
    const { api, id } = await evaluacionNueva({}, ['VOC1', 'VOC2']);
    const c = await cargado(api, id);
    await entrar(c);
    await vencer(c, 300);
    c.continuar();
    await dejarResolver();
    await entrar(c);
    expect(ejecucion(c).posicion).toBe(2);
    await vencer(c, 360);
    expect(c.obtenerEstado()).toMatchObject({ fase: 'transicion', siguiente: null });
    c.continuar();
    expect(c.obtenerEstado()).toMatchObject({ fase: 'listaParaFinalizar', finalizando: false });
    c.continuar();
    await dejarResolver();
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'finalizada',
      estadoResultado: 'PENDIENTE_VALIDACION',
    });
  });

  it('no deja finalizar mientras haya subpruebas sin cerrar', async () => {
    const { api, id } = await evaluacionNueva();
    await expect(api.finalizarEvaluacion(id)).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBAS_PENDIENTES' },
    });
  });

  it('numera como la hoja: VOC2 empieza en 41 y no muestra «de N»', async () => {
    const { api, id } = await evaluacionNueva({}, ['VOC2']);
    const c = await cargado(api, id);
    await entrar(c);
    expect(ejecucion(c).preguntas[0].numero).toBe(41);
  });
});

describe('respuestas y guardado', () => {
  it('guarda la selección y marca guardado', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    await entrar(c);
    const p = ejecucion(c).preguntas[0];
    c.seleccionar(p.id, 'B');
    expect(ejecucion(c)).toMatchObject({ guardado: 'saving' });
    await dejarResolver();
    expect(ejecucion(c)).toMatchObject({ guardado: 'saved', respuestas: { [p.id]: 'B' } });
    expect((await api.obtenerPreguntas(id, 'VOC1')).preguntas[0].respuestaActual).toBe('B');
  });

  it('si falla la red, avisa y reenvía lo pendiente en el siguiente cambio', async () => {
    const { api, id } = await evaluacionNueva();
    let caida = true;
    const real = api.registrarRespuestas.bind(api);
    api.registrarRespuestas = async (...args) => {
      if (caida) throw new TypeError('Failed to fetch');
      return real(...args);
    };
    const c = await cargado(api, id);
    await entrar(c);
    const [p1, p2] = ejecucion(c).preguntas;
    c.seleccionar(p1.id, 'A');
    await dejarResolver();
    expect(ejecucion(c).guardado).toBe('error');
    caida = false;
    c.seleccionar(p2.id, 'C');
    await dejarResolver();
    expect(ejecucion(c).guardado).toBe('saved');
    const guardadas = (await api.obtenerPreguntas(id, 'VOC1')).preguntas;
    expect(guardadas.map((p) => p.respuestaActual)).toEqual(['A', 'C', null]);
  });

  it('si el servidor responde tiempo agotado al guardar, pasa al cierre oficial', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    await entrar(c);
    avanzar(301);
    c.seleccionar(ejecucion(c).preguntas[0].id, 'A');
    await dejarResolver();
    expect(c.obtenerEstado()).toMatchObject({ fase: 'transicion', cerrando: false });
    await expect(api.obtenerPreguntas(id, 'VOC2')).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBA_NO_ACTIVA' },
    });
  });

  it('Fluidez Verbal usa la letra asignada y guarda las palabras con espera', async () => {
    const { api, id } = await evaluacionNueva({}, ['FV']);
    const c = await cargado(api, id);
    await entrar(c);
    expect(ejecucion(c).letraInicial).toBe('M');
    c.escribirPalabras(['mesa', '', 'montaña']);
    await vi.advanceTimersByTimeAsync(150);
    expect(ejecucion(c).guardado).toBe('saved');
    const r = await api.obtenerPreguntas(id, 'FV');
    expect(r.palabras).toEqual([
      { ordenEntrada: 1, texto: 'mesa' },
      { ordenEntrada: 3, texto: 'montaña' },
    ]);
  });
});

describe('recuperación y errores', () => {
  it('retoma la subprueba activa con el reloj del servidor, sin reiniciarlo', async () => {
    const { api, id } = await evaluacionNueva();
    const primero = await cargado(api, id);
    await entrar(primero);
    const p = ejecucion(primero).preguntas[0];
    primero.seleccionar(p.id, 'D');
    await dejarResolver();
    primero.detener();

    avanzar(100); // la persona se cayó 100 s
    const segundo = await cargado(api, id);
    const e = ejecucion(segundo);
    expect(e).toMatchObject({ fase: 'ejecucion', recuperada: true });
    expect(segundo.segundosRestantes(e)).toBe(200);
    expect(e.respuestas[p.id]).toBe('D');
    expect(e.indice).toBe(1); // primera sin responder
  });

  it('recuperar Fluidez Verbal conserva palabras y letra', async () => {
    const { api, id } = await evaluacionNueva({}, ['FV']);
    const c = await cargado(api, id);
    await entrar(c);
    c.escribirPalabras(['mesa']);
    await vi.advanceTimersByTimeAsync(150);
    const otro = await cargado(api, id);
    expect(ejecucion(otro)).toMatchObject({
      letraInicial: 'M',
      palabras: ['mesa'],
      recuperada: true,
    });
  });

  it('una evaluación ya finalizada se abre como finalizada', async () => {
    const { api, id } = await evaluacionNueva({}, ['VOC1']);
    const c = await cargado(api, id);
    await entrar(c);
    await vencer(c, 300);
    c.continuar();
    c.continuar();
    await dejarResolver();
    expect(fase(await cargado(api, id))).toBe('finalizada');
  });

  it('error de carga no reintentable: evaluación inexistente', async () => {
    const api = new BfaApiSimulada({ ahora });
    const c = await cargado(api, 999);
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'EVALUACION_NO_ENCONTRADA', reintentable: false },
    });
  });

  it('error de red: reintentable y se recupera al volver la conexión', async () => {
    const { api, id } = await evaluacionNueva();
    let caida = true;
    const real = api.obtenerEvaluacion.bind(api);
    api.obtenerEvaluacion = async (n) => {
      if (caida) throw new TypeError('Failed to fetch');
      return real(n);
    };
    const c = await cargado(api, id);
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'SIN_CONEXION', reintentable: true },
    });
    caida = false;
    await c.reintentar();
    expect(fase(c)).toBe('preparacion');
  });

  it('un conflicto al iniciar (409) ofrece recargar el estado oficial', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    api.iniciarSubprueba = async () => {
      throw new ApiError(409, {
        timestamp: '',
        status: 409,
        codigo: 'SUBPRUEBA_FUERA_DE_ORDEN',
        mensaje: 'x',
        ruta: '',
      });
    };
    await entrar(c);
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'SUBPRUEBA_FUERA_DE_ORDEN', reintentable: true },
    });
  });

  it('mientras el servidor no confirma el cierre, espera y consulta de nuevo', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    await entrar(c);
    const real = api.obtenerEvaluacion.bind(api);
    let confirmado = false;
    api.obtenerEvaluacion = async (n) => {
      const e = await real(n);
      return confirmado
        ? e
        : {
            ...e,
            subpruebas: e.subpruebas.map((s) =>
              s.codigo === 'VOC1' ? { ...s, estado: 'ACTIVA' as const } : s,
            ),
            subpruebaActiva: { codigo: 'VOC1', finLimite: '', segundosRestantes: 0 },
          };
    };
    await vencer(c, 300);
    expect(c.obtenerEstado()).toMatchObject({ fase: 'transicion', cerrando: true });
    confirmado = true;
    avanzar(2);
    c.tick();
    await dejarResolver();
    expect(c.obtenerEstado()).toMatchObject({ fase: 'transicion', cerrando: false });
  });
});

describe('casos de GEN-03 y GEN-04 sobre la interfaz', () => {
  it('TC-GEN-03-006: se puede volver a una pregunta anterior de la subprueba activa', async () => {
    const { api, id } = await evaluacionNueva();
    const c = await cargado(api, id);
    await entrar(c);
    c.siguiente();
    c.siguiente();
    expect(ejecucion(c).indice).toBe(2);
    c.anterior();
    c.anterior();
    expect(ejecucion(c).indice).toBe(0);
    c.anterior();
    expect(ejecucion(c).indice).toBe(0);
  });

  it('TC-GEN-03-006: desde la pantalla final se vuelve a revisar y luego atrás', async () => {
    const { api, id } = await evaluacionNueva({ preguntasPorSubprueba: 2 });
    const c = await cargado(api, id);
    await entrar(c);
    c.siguiente();
    c.siguiente();
    expect(ejecucion(c).alFinal).toBe(true);
    c.anterior(); // no hace nada: primero hay que volver a revisar
    expect(ejecucion(c).alFinal).toBe(true);
    c.revisar();
    c.anterior();
    expect(ejecucion(c)).toMatchObject({ alFinal: false, indice: 0 });
  });

  it('TC-GEN-03-010: repetir el inicio de la subprueba activa no reinicia el tiempo', async () => {
    const { api, id } = await evaluacionNueva();
    const primero = await api.iniciarSubprueba(id, 'VOC1');
    avanzar(40);
    const repetido = await api.iniciarSubprueba(id, 'VOC1');
    expect(repetido.inicio).toBe(primero.inicio);
    expect(repetido.finLimite).toBe(primero.finLimite);
    expect(repetido.segundosRestantes).toBe(260);
  });

  it('TC-GEN-04-009: un doble clic en finalizar envía una sola solicitud', async () => {
    const { api, id } = await evaluacionNueva({}, ['VOC1']);
    const c = await cargado(api, id);
    await entrar(c);
    await vencer(c, 300);
    c.continuar(); // transición → lista para finalizar
    const finalizar = vi.spyOn(api, 'finalizarEvaluacion');
    c.continuar();
    c.continuar();
    await dejarResolver();
    expect(finalizar).toHaveBeenCalledTimes(1);
    expect(fase(c)).toBe('finalizada');
  });

  it('TC-GEN-04-007: si falla la conexión al finalizar, informa y no queda finalizada', async () => {
    const { api, id } = await evaluacionNueva({}, ['VOC1']);
    const c = await cargado(api, id);
    await entrar(c);
    await vencer(c, 300);
    c.continuar(); // transición → lista para finalizar
    api.finalizarEvaluacion = async () => {
      throw new TypeError('Failed to fetch');
    };
    c.continuar();
    await dejarResolver();
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'SIN_CONEXION', reintentable: true },
    });
    await c.reintentar();
    expect(c.obtenerEstado()).toMatchObject({ fase: 'listaParaFinalizar', finalizando: false });
  });

  it('TC-GEN-04-008: sin permiso se informa y no se ofrece reintentar', async () => {
    const { api, id } = await evaluacionNueva({}, ['VOC1']);
    const c = await cargado(api, id);
    await entrar(c);
    await vencer(c, 300);
    c.continuar(); // transición → lista para finalizar
    api.finalizarEvaluacion = async () => {
      throw new ApiError(403, {
        timestamp: '',
        status: 403,
        codigo: 'SIN_PERMISO',
        mensaje: 'x',
        ruta: '',
      });
    };
    c.continuar();
    await dejarResolver();
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'SIN_PERMISO', reintentable: false },
    });
  });
});

describe('Fluidez Verbal según el contrato del 2026-11-08', () => {
  it('BUG-03: lo que se escribe viaja en E7 como palabras con ordenEntrada', async () => {
    const { api, id } = await evaluacionNueva({}, ['FV']);
    const enviados: unknown[] = [];
    const real = api.registrarRespuestas.bind(api);
    api.registrarRespuestas = async (...args) => {
      enviados.push(args[2]);
      return real(...args);
    };
    const c = await cargado(api, id);
    await entrar(c);
    c.escribirPalabras(['mesa', 'montaña']);
    await vi.advanceTimersByTimeAsync(150);
    expect(enviados.at(-1)).toEqual({
      palabras: [
        { ordenEntrada: 1, texto: 'mesa' },
        { ordenEntrada: 2, texto: 'montaña' },
      ],
    });
  });

  const memoria = () => {
    const datos = new Map<string, string>();
    return {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    };
  };
  const sinLetraEnE6 = (api: BfaApiSimulada) => {
    const real = api.obtenerPreguntas.bind(api);
    api.obtenerPreguntas = async (...args) => ({
      ...(await real(...args)),
      letraInicial: undefined,
    });
  };

  it('TC-GEN-03-028: el servidor rechaza texto vacío, orden repetido y la entrada 76', async () => {
    const { api, id } = await evaluacionNueva({}, ['FV']);
    await api.iniciarSubprueba(id, 'FV');
    const invalidas = [
      [{ ordenEntrada: 1, texto: ' ' }],
      [
        { ordenEntrada: 1, texto: 'mesa' },
        { ordenEntrada: 1, texto: 'mano' },
      ],
      [{ ordenEntrada: 76, texto: 'mesa' }],
    ];
    for (const palabras of invalidas) {
      await expect(api.registrarRespuestas(id, 'FV', { palabras })).rejects.toMatchObject({
        status: 400,
      });
    }
    expect((await api.obtenerPreguntas(id, 'FV')).palabras).toEqual([]);
  });

  it('TC-GEN-03-002: al recargar, la letra sigue visible aunque E6 no la devuelva', async () => {
    const { api, id } = await evaluacionNueva({}, ['FV']);
    const almacenLetra = memoria();
    const primero = new ControladorBfa(api, id, { ahora, esperaGuardadoMs: 100, almacenLetra });
    await primero.cargar();
    await entrar(primero);
    primero.escribirPalabras(['mesa', 'montaña']);
    await vi.advanceTimersByTimeAsync(150);
    sinLetraEnE6(api);
    const segundo = new ControladorBfa(api, id, { ahora, almacenLetra });
    await segundo.cargar();
    expect(ejecucion(segundo)).toMatchObject({ letraInicial: 'M', palabras: ['mesa', 'montaña'] });
  });

  it('sin la letra en E6 ni en este navegador, informa en vez de mostrar una pantalla vacía', async () => {
    const { api, id } = await evaluacionNueva({}, ['FV']);
    const primero = new ControladorBfa(api, id, { ahora, almacenLetra: memoria() });
    await primero.cargar();
    await entrar(primero);
    sinLetraEnE6(api);
    const otroNavegador = new ControladorBfa(api, id, { ahora, almacenLetra: memoria() });
    await otroNavegador.cargar();
    expect(otroNavegador.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'LETRA_NO_DISPONIBLE' },
    });
  });
});

describe('E24: instrucciones y ejemplos de práctica', () => {
  const preparacion = (c: ControladorBfa) => {
    const e = c.obtenerEstado();
    if (e.fase !== 'preparacion') throw new Error(`fase ${e.fase}`);
    return e;
  };

  it('TC-GEN-03-003: muestra instrucciones y ejemplos del servidor antes de iniciar el tiempo', async () => {
    const { api, id } = await evaluacionNueva({ ejemplosPractica: 2 });
    const c = await cargado(api, id);
    expect(preparacion(c).contenido?.instrucciones).toContain('Vocabulario - Forma A');
    c.continuar();
    expect(preparacion(c)).toMatchObject({ paso: 'practica', ejemplo: 0 });
    c.seleccionarPractica('B');
    expect(preparacion(c).seleccion).toBe('B');
    c.continuar();
    expect(preparacion(c)).toMatchObject({ paso: 'practica', ejemplo: 1, seleccion: null });
    expect((await api.obtenerEvaluacion(id)).subpruebaActiva).toBeNull();
    c.continuar();
    await dejarResolver();
    expect(fase(c)).toBe('ejecucion');
  });

  it('la práctica no guarda nada ni consume tiempo oficial', async () => {
    const { api, id } = await evaluacionNueva();
    const registrar = vi.spyOn(api, 'registrarRespuestas');
    const c = await cargado(api, id);
    c.continuar();
    c.seleccionarPractica('A');
    expect(registrar).not.toHaveBeenCalled();
    expect((await api.obtenerEvaluacion(id)).subpruebaActiva).toBeNull();
  });

  it('si E24 devuelve una subprueba sin ejemplos, pasa directo a iniciar', async () => {
    const { api, id } = await evaluacionNueva({ ejemplosPractica: 0 });
    const c = await cargado(api, id);
    c.continuar();
    await dejarResolver();
    expect(fase(c)).toBe('ejecucion');
  });

  it('mientras E24 no exista en el backend, usa los textos provisionales y sigue', async () => {
    const { api, id } = await evaluacionNueva();
    api.consultarInstrucciones = async () => {
      throw new ApiError(404, {
        timestamp: '',
        status: 404,
        codigo: 'RUTA_NO_ENCONTRADA',
        mensaje: 'x',
        ruta: '',
      });
    };
    const c = await cargado(api, id);
    expect(preparacion(c).contenido).toBeNull();
    c.continuar();
    expect(preparacion(c)).toMatchObject({ paso: 'practica', contenido: null });
    c.continuar();
    await dejarResolver();
    expect(fase(c)).toBe('ejecucion');
  });

  it('un error real de E24 se informa: no se inventan instrucciones', async () => {
    const { api, id } = await evaluacionNueva();
    api.consultarInstrucciones = async () => {
      throw new ApiError(500, {
        timestamp: '',
        status: 500,
        codigo: 'ERROR_INTERNO',
        mensaje: 'x',
        ruta: '',
      });
    };
    const c = await cargado(api, id);
    expect(c.obtenerEstado()).toMatchObject({
      fase: 'error',
      error: { codigo: 'ERROR_INTERNO', reintentable: true },
    });
  });
});
