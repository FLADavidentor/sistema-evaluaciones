import { describe, expect, it } from 'vitest';
import { BfaApiSimulada } from '../features/bfa/api/bfaApiSimulada';
import { crearClienteResultadosBfa } from '../features/bfa/perfil/resultadosSimulados';
import { ApiError } from './http';
import { RevisionSimulada } from './revision.mock';

async function finalizada(palabras = ['uno', 'dos', 'tres']) {
  let ahora = 1_000_000;
  const api = new BfaApiSimulada({ ahora: () => ahora });
  const e = await api.iniciarEvaluacion({
    versionFormularioId: 10,
    sujetoId: 25,
    periodoId: 3,
    fluidez: { letraInicial: 'M' },
    subpruebas: ['FV'],
  });
  await api.iniciarSubprueba(e.id, 'FV');
  await api.registrarRespuestas(e.id, 'FV', {
    palabras: palabras.map((texto, i) => ({ ordenEntrada: i + 1, texto })),
  });
  ahora += 3_600_000;
  await api.finalizarEvaluacion(e.id);
  const revision = new RevisionSimulada(api, 0);
  return { api, revision, id: e.id };
}

const codigoDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
    return 'OK';
  } catch (e) {
    return e instanceof ApiError ? e.error?.codigo : (e as Error).name;
  }
};

describe('mock de E10, E11 y E12', () => {
  it('lista las palabras de FV como pendientes en la revisión 1 sin vigente', async () => {
    const { revision, id } = await finalizada();
    const b = await revision.cargar(id);
    expect(b).toMatchObject({ revision: 1, revisionVigente: null });
    expect(b.palabras.map((p) => [p.texto, p.decision])).toEqual([
      ['uno', 'PENDIENTE'],
      ['dos', 'PENDIENTE'],
      ['tres', 'PENDIENTE'],
    ]);
  });

  it('E10 registra la decisión y repetirla no duplica la palabra', async () => {
    const { revision, id } = await finalizada();
    const { calificacionId, palabras } = await revision.cargar(id);
    const cuerpo = { decision: 'VALIDA' as const, motivo: 'cumple' };
    const a = await revision.revisarPalabra(
      id,
      calificacionId ?? 0,
      palabras[0].respuestaId,
      cuerpo,
    );
    expect(a).toMatchObject({ decision: 'VALIDA', origenDecision: 'REVISION_AUTORIZADA' });
    await revision.revisarPalabra(id, calificacionId ?? 0, palabras[0].respuestaId, cuerpo);
    const b = await revision.cargar(id);
    expect(b.palabras).toHaveLength(3);
    expect(b.palabras[0]).toMatchObject({ decision: 'VALIDA', motivo: 'cumple' });
  });

  it('E10 rechaza motivo vacío, calificación ajena y respuesta que no es de FV', async () => {
    const { revision, id } = await finalizada();
    const { calificacionId, palabras } = await revision.cargar(id);
    const r = palabras[0].respuestaId;
    const ok = { decision: 'INVALIDA' as const, motivo: 'x' };
    expect(
      await codigoDe(revision.revisarPalabra(id, calificacionId ?? 0, r, { ...ok, motivo: ' ' })),
    ).toBe('SOLICITUD_INVALIDA');
    expect(await codigoDe(revision.revisarPalabra(id, 1, r, ok))).toBe(
      'CALIFICACION_NO_ENCONTRADA',
    );
    expect(await codigoDe(revision.revisarPalabra(id, calificacionId ?? 0, 1, ok))).toBe(
      'RESPUESTA_NO_FV',
    );
  });

  it('E11 crea una nueva revisión y reenviar la misma solicitud devuelve la misma', async () => {
    const { revision, id } = await finalizada();
    expect(await codigoDe(revision.recalcular(id, { motivo: '' }))).toBe('SOLICITUD_INVALIDA');
    const a = await revision.recalcular(id, { motivo: 'ajuste', idSolicitud: 's1' });
    const b = await revision.recalcular(id, { motivo: 'ajuste', idSolicitud: 's1' });
    expect(a.revision).toBe(2);
    expect(b).toEqual(a);
    expect((await revision.cargar(id)).calificacionId).toBe(a.calificacionId);
  });

  it('E12 exige decidir todo; publica la revisión y es idempotente', async () => {
    const { revision, id } = await finalizada();
    const { calificacionId, palabras } = await revision.cargar(id);
    const cuerpo = {
      calificacionId: calificacionId ?? 0,
      motivo: 'validada',
      revisionVigenteEsperada: null,
      audiencia: ['SUJETO'],
    };
    expect(await codigoDe(revision.publicar(id, cuerpo))).toBe('REVISION_NO_PUBLICABLE');
    for (const p of palabras)
      await revision.revisarPalabra(id, calificacionId ?? 0, p.respuestaId, {
        decision: 'VALIDA',
        motivo: 'ok',
      });
    expect(await codigoDe(revision.publicar(id, { ...cuerpo, revisionVigenteEsperada: 3 }))).toBe(
      'REVISION_VIGENTE_CAMBIO',
    );
    const p = await revision.publicar(id, cuerpo);
    expect(p).toMatchObject({ revision: 1, estadoResultado: 'DISPONIBLE' });
    expect(await revision.publicar(id, cuerpo)).toEqual(p);
    // Con la revisión ya vigente, E10 responde 409 y solo queda recalcular.
    expect(
      await codigoDe(
        revision.revisarPalabra(id, calificacionId ?? 0, palabras[0].respuestaId, {
          decision: 'INVALIDA',
          motivo: 'x',
        }),
      ),
    ).toBe('REVISION_COMPLETADA');
  });

  it('una evaluación en curso responde 409 EVALUACION_NO_FINALIZADA', async () => {
    const api = new BfaApiSimulada();
    const e = await api.iniciarEvaluacion({
      versionFormularioId: 10,
      sujetoId: 1,
      periodoId: 1,
      fluidez: { letraInicial: 'M' },
    });
    expect(await codigoDe(new RevisionSimulada(api, 0).cargar(e.id))).toBe(
      'EVALUACION_NO_FINALIZADA',
    );
  });

  it('E9 simulado: PENDIENTE_VALIDACION hasta publicar y DISPONIBLE después', async () => {
    const { api, revision, id } = await finalizada();
    const e9 = crearClienteResultadosBfa(
      api,
      { obtenerResultado: () => Promise.reject(new Error('sin respaldo')) },
      revision,
    );
    const antes = await e9.obtenerResultado(id);
    expect(antes).toMatchObject({
      estadoResultado: 'PENDIENTE_VALIDACION',
      calificacionId: null,
      revision: null,
      factores: [],
    });
    const { calificacionId, palabras } = await revision.cargar(id);
    for (const p of palabras)
      await revision.revisarPalabra(id, calificacionId ?? 0, p.respuestaId, {
        decision: 'INVALIDA',
        motivo: 'ok',
      });
    await revision.publicar(id, {
      calificacionId: calificacionId ?? 0,
      motivo: 'v',
      revisionVigenteEsperada: null,
      audiencia: ['SUJETO'],
    });
    const despues = await e9.obtenerResultado(id);
    expect(despues).toMatchObject({ estadoResultado: 'DISPONIBLE', revision: 1 });
    expect(despues.factores.length).toBeGreaterThan(0);
  });
});
