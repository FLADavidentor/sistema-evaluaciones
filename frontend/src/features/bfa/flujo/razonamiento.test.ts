import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import { presentacionDe } from '../familias';
import { ControladorBfa, type EstadoEjecucion } from './controlador';

// Funcionales de BFA-FE-04: R1 y R2 dentro del flujo general, contra el servidor simulado.

let ahoraMs = 0;
const ahora = () => ahoraMs;
const avanzar = (segundos: number) => {
  ahoraMs += segundos * 1000;
};
const dejarResolver = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  ahoraMs = 1_000_000;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

async function razonamiento(preguntas = 3) {
  const api = new BfaApiSimulada({ ahora, preguntasPorSubprueba: preguntas });
  const { id } = await api.iniciarEvaluacion({
    versionFormularioId: 10,
    sujetoId: 25,
    periodoId: 3,
    subpruebas: ['R1', 'R2'],
  });
  const c = new ControladorBfa(api, id, { ahora, esperaGuardadoMs: 100, intervaloSondeoMs: 1000 });
  await c.cargar();
  return { api, id, c };
}

const ejecucion = (c: ControladorBfa) => c.obtenerEstado() as EstadoEjecucion;

async function entrar(c: ControladorBfa) {
  c.continuar();
  c.continuar();
  await dejarResolver();
}

async function cerrarPorTiempo(c: ControladorBfa, segundos: number) {
  avanzar(segundos);
  c.tick();
  await dejarResolver();
}

describe('BFA-FE-04 · Razonamiento A y B', () => {
  it('los tiempos oficiales llegan del servidor: 10:00 para R1 y 12:00 para R2', async () => {
    const { api, c } = await razonamiento();
    const test = await api.obtenerTest(1);
    expect(test.subpruebas.find((s) => s.codigo === 'R1')?.tiempoLimiteSegundos).toBe(600);
    expect(test.subpruebas.find((s) => s.codigo === 'R2')?.tiempoLimiteSegundos).toBe(720);

    await entrar(c);
    expect(ejecucion(c).subprueba.codigo).toBe('R1');
    expect(c.segundosRestantes(ejecucion(c))).toBe(600);

    await cerrarPorTiempo(c, 600);
    c.continuar();
    await dejarResolver();
    await entrar(c);
    expect(ejecucion(c).subprueba.codigo).toBe('R2');
    expect(c.segundosRestantes(ejecucion(c))).toBe(720);
  });

  it('muestra una pregunta a la vez con cuatro alternativas A-D', async () => {
    const { c } = await razonamiento();
    await entrar(c);
    const e = ejecucion(c);
    expect(e.indice).toBe(0);
    for (const pregunta of e.preguntas) {
      expect(pregunta.opciones.map((o) => o.letra)).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('permite una sola selección por pregunta y cambiarla', async () => {
    const { api, id, c } = await razonamiento();
    await entrar(c);
    const pregunta = ejecucion(c).preguntas[0];
    c.seleccionar(pregunta.id, 'A');
    c.seleccionar(pregunta.id, 'C');
    await dejarResolver();
    expect(ejecucion(c).respuestas[pregunta.id]).toBe('C');
    expect(Object.keys(ejecucion(c).respuestas)).toHaveLength(1);
    expect((await api.obtenerPreguntas(id, 'R1')).preguntas[0].respuestaActual).toBe('C');
  });

  it('mientras la subprueba está activa se puede volver y cambiar respuestas anteriores', async () => {
    const { api, id, c } = await razonamiento();
    await entrar(c);
    const [p1, p2] = ejecucion(c).preguntas;
    c.seleccionar(p1.id, 'B');
    c.siguiente();
    c.seleccionar(p2.id, 'D');
    c.anterior();
    expect(ejecucion(c).indice).toBe(0);
    c.seleccionar(p1.id, 'A');
    await dejarResolver();
    const guardadas = (await api.obtenerPreguntas(id, 'R1')).preguntas;
    expect(guardadas.map((p) => p.respuestaActual)).toEqual(['A', 'D', null]);
    expect(presentacionDe('R1').volverAtras).toBe(true);
    expect(presentacionDe('R2').volverAtras).toBe(true);
  });

  it('muestra el estado de guardado: guardando y luego guardado', async () => {
    const { c } = await razonamiento();
    await entrar(c);
    c.seleccionar(ejecucion(c).preguntas[0].id, 'B');
    expect(ejecucion(c).guardado).toBe('saving');
    await dejarResolver();
    expect(ejecucion(c).guardado).toBe('saved');
  });

  it('una subprueba cerrada no permite modificar respuestas ni regresar a ella', async () => {
    const { api, id, c } = await razonamiento();
    await entrar(c);
    const pregunta = ejecucion(c).preguntas[0];
    c.seleccionar(pregunta.id, 'B');
    await dejarResolver();
    await cerrarPorTiempo(c, 600);
    expect(c.obtenerEstado()).toMatchObject({ fase: 'transicion', cerrando: false });

    c.seleccionar(pregunta.id, 'D'); // la interfaz ya no acepta cambios
    await dejarResolver();
    await expect(
      api.registrarRespuestas(id, 'R1', { respuestas: [{ preguntaId: pregunta.id, opcion: 'D' }] }),
    ).rejects.toMatchObject({ error: { codigo: 'SUBPRUEBA_NO_ACTIVA' } });
    await expect(api.iniciarSubprueba(id, 'R1')).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBA_CERRADA' },
    });
    await expect(api.obtenerPreguntas(id, 'R1')).rejects.toMatchObject({
      error: { codigo: 'SUBPRUEBA_NO_ACTIVA' },
    });
  });

  it('no se muestran respuestas correctas ni puntuaciones durante la aplicación', async () => {
    const { api, id, c } = await razonamiento();
    await entrar(c);
    const recibido = await api.obtenerPreguntas(id, 'R1');
    expect(Object.keys(recibido).sort()).toEqual(['codigo', 'preguntas', 'segundosRestantes']);
    for (const pregunta of recibido.preguntas) {
      expect(Object.keys(pregunta).sort()).toEqual([
        'enunciado',
        'id',
        'numero',
        'opciones',
        'respuestaActual',
      ]);
      for (const opcion of pregunta.opciones)
        expect(Object.keys(opcion).sort()).toEqual(['letra', 'texto']);
    }
    expect(JSON.stringify(ejecucion(c))).not.toMatch(/correct|puntaj|clave/i);
  });

  it('cada pregunta de R1 y R2 se dibuja con su familia y trae un solo hueco', async () => {
    const { api, id, c } = await razonamiento(6);
    for (const codigo of ['R1', 'R2']) {
      if (codigo === 'R2') {
        await cerrarPorTiempo(c, 600);
        c.continuar();
        await dejarResolver();
      }
      await entrar(c);
      const { preguntas } = await api.obtenerPreguntas(id, codigo);
      const presentacion = presentacionDe(codigo);
      expect(presentacion.renderEnunciado).toBeDefined();
      for (const pregunta of preguntas) {
        const marcado = renderToStaticMarkup(presentacion.renderEnunciado?.(pregunta.enunciado));
        expect(marcado.match(/razon-hueco/g)).toHaveLength(1);
        for (const opcion of pregunta.opciones) {
          expect(renderToStaticMarkup(presentacion.renderOpcion?.(opcion.texto))).toContain(
            opcion.texto,
          );
        }
      }
    }
  });
});
