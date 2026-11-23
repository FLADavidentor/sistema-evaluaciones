import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/http';
import type { ClienteResultados } from '../../resultados/tipos';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import { CODIGOS_PERFIL } from './catalogo';
import { esResultadoBfa } from './presentacionPerfil';
import { crearClienteResultadosBfa, resultadoBfaSimulado } from './resultadosSimulados';

const respaldo: ClienteResultados = {
  obtenerResultado: async (id) => {
    throw new ApiError(404, {
      timestamp: '',
      status: 404,
      codigo: 'EVALUACION_NO_ENCONTRADA',
      mensaje: `respaldo ${id}`,
      ruta: '',
    });
  },
};

async function finalizada(subpruebas?: string[]) {
  let ahora = 1_000_000;
  const api = new BfaApiSimulada({ ahora: () => ahora });
  const e = await api.iniciarEvaluacion({
    versionFormularioId: 10,
    sujetoId: 25,
    periodoId: 3,
    fluidez: { letraInicial: 'M' },
    ...(subpruebas ? { subpruebas } : {}),
  });
  ahora += 3_600_000;
  return { api, id: e.id };
}

describe('E9 simulado para BFA (BFA-FE-08)', () => {
  it('una evaluación en curso responde 409 EVALUACION_NO_FINALIZADA', async () => {
    const { api, id } = await finalizada();
    const cliente = crearClienteResultadosBfa(api, respaldo);
    await expect(cliente.obtenerResultado(id)).rejects.toMatchObject({
      status: 409,
      error: { codigo: 'EVALUACION_NO_FINALIZADA' },
    });
  });

  it('una aplicación completa finalizada trae los 18 códigos calculados y convertidos', async () => {
    const { api, id } = await finalizada();
    const evaluacion = { ...(await api.obtenerEvaluacion(id)), estado: 'FINALIZADA' as const };
    const r = resultadoBfaSimulado(evaluacion, await api.obtenerTest(1));
    expect(r).toMatchObject({ evaluacionId: id, estadoResultado: 'DISPONIBLE', revision: 1 });
    expect(r.factores.map((f) => f.codigo)).toEqual(CODIGOS_PERFIL);
    expect(r.factores.every((f) => f.estadoNormativo === 'CONVERTIDO')).toBe(true);
    expect(esResultadoBfa(r.factores)).toBe(true);
  });

  it('en una aplicación parcial no calcula lo que depende de subpruebas no aplicadas', async () => {
    const { api, id } = await finalizada(['VOC1', 'VOC2']);
    const evaluacion = { ...(await api.obtenerEvaluacion(id)), estado: 'FINALIZADA' as const };
    const r = resultadoBfaSimulado(evaluacion, await api.obtenerTest(1));
    const estado = (c: string) => r.factores.find((f) => f.codigo === c)?.estadoCalculo;
    expect(estado('VOCT')).toBe('CALCULADO');
    expect(estado('S1')).toBe('NO_CALCULABLE');
    expect(estado('EIV')).toBe('NO_CALCULABLE');
    expect(r.factores.find((f) => f.codigo === 'EIV')?.motivo).toContain('CV');
  });

  it('una evaluación desconocida se delega en el mock general', async () => {
    const { api } = await finalizada();
    const cliente = crearClienteResultadosBfa(api, respaldo);
    await expect(cliente.obtenerResultado(999)).rejects.toThrow('respaldo 999');
  });
});
