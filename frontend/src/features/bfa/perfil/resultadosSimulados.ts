import { ApiError } from '../../../services/http';
import type { ClienteResultados, ResultadoFactor, ResultadoResponse } from '../../resultados/tipos';
import { revisionSimuladaDe, type RevisionSimulada } from '../../../services/revision.mock';
import type { BfaApi } from '../api/bfaApi';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import type { EvaluacionResponse, TestDetalle } from '../api/tipos';
import { CODIGOS_PERFIL } from './catalogo';

/**
 * E9 simulado para una evaluación de la API simulada de BFA (BFA-FE-08).
 * Hace de servidor: los valores son FICTICIOS y deterministas, no conversiones de un baremo.
 * Hasta que la revisión se valida y publica (E12, BFA-FE-09) responde PENDIENTE_VALIDACION sin factores.
 */

// Totales y compuestos con sus componentes (Documento BFA §2.5); solo los usa la simulación.
const DERIVADOS: [string, [string, number][]][] = [
  [
    'VOCT',
    [
      ['VOC1', 1],
      ['VOC2', 1],
    ],
  ],
  [
    'ST',
    [
      ['S1', 1],
      ['S2', 1],
    ],
  ],
  [
    'RT',
    [
      ['R1', 1],
      ['R2', 1],
    ],
  ],
  [
    'NT',
    [
      ['N1', 1],
      ['N2', 1],
    ],
  ],
  [
    'EIV',
    [
      ['CV', 2],
      ['VOCT', 1],
      ['FV', 1],
    ],
  ],
  [
    'EIC',
    [
      ['RT', 2],
      ['ST', 1],
      ['NT', 1],
    ],
  ],
  [
    'EIG',
    [
      ['EIV', 1],
      ['EIC', 1],
    ],
  ],
  [
    'AE',
    [
      ['RT', 2],
      ['CV', 1],
      ['VOCT', 1],
    ],
  ],
];

const PERCENTILES = [20, 35, 45, 50, 60, 70, 80, 90];

export function resultadoBfaSimulado(
  evaluacion: EvaluacionResponse,
  test: TestDetalle,
  revision = 1,
): ResultadoResponse {
  const aplicadas = new Set(evaluacion.subpruebas.map((s) => s.codigo));
  const pd = new Map<string, number>();
  const factores = new Map<string, ResultadoFactor>();
  const indice = (codigo: string) => CODIGOS_PERFIL.indexOf(codigo);

  const calculado = (codigo: string, valor: number): ResultadoFactor => {
    pd.set(codigo, valor);
    const i = indice(codigo);
    return {
      codigo,
      puntuacionDirecta: valor,
      estadoCalculo: 'CALCULADO',
      percentil: PERCENTILES[(evaluacion.id + i) % PERCENTILES.length],
      idRango: 1000 + i,
      estadoNormativo: 'CONVERTIDO',
      motivo: null,
    };
  };
  const noCalculable = (codigo: string, motivo: string): ResultadoFactor => ({
    codigo,
    puntuacionDirecta: null,
    estadoCalculo: 'NO_CALCULABLE',
    percentil: null,
    idRango: null,
    estadoNormativo: 'NO_APLICA',
    motivo,
  });

  // Factores base: se calculan si se aplicaron todas sus subpruebas (S1 y S1b → S1, etc.).
  const porFactor = new Map<string, string[]>();
  for (const s of test.subpruebas) {
    if (!s.factor) continue;
    porFactor.set(s.factor, [...(porFactor.get(s.factor) ?? []), s.codigo]);
  }
  for (const [factor, codigos] of porFactor) {
    const faltan = codigos.filter((c) => !aplicadas.has(c));
    factores.set(
      factor,
      faltan.length
        ? noCalculable(factor, `Subprueba no incluida en la aplicación: ${faltan.join(', ')}.`)
        : calculado(factor, 8 + ((evaluacion.id * 7 + indice(factor) * 5) % 18)),
    );
  }
  for (const [codigo, partes] of DERIVADOS) {
    const faltan = partes.filter(([c]) => !pd.has(c)).map(([c]) => c);
    factores.set(
      codigo,
      faltan.length
        ? noCalculable(codigo, `Falta un componente: ${faltan.join(', ')}.`)
        : calculado(
            codigo,
            partes.reduce((suma, [c, peso]) => suma + peso * (pd.get(c) ?? 0), 0),
          ),
    );
  }

  return {
    evaluacionId: evaluacion.id,
    resultadoId: evaluacion.resultadoId ?? evaluacion.id,
    estadoResultado: 'DISPONIBLE',
    versionFormularioId: evaluacion.versionFormularioId ?? test.versionFormularioId,
    calificacionId: 900 + evaluacion.id,
    revision,
    versionReglas: 'BFA-REGLAS-SIM',
    idClave: 1,
    idBaremo: 1,
    factores: CODIGOS_PERFIL.flatMap((c) => factores.get(c) ?? []),
  };
}

/** E9 de una evaluación finalizada cuya revisión aún no se publicó. */
export const resultadoPendienteSimulado = (evaluacion: EvaluacionResponse): ResultadoResponse => ({
  evaluacionId: evaluacion.id,
  resultadoId: evaluacion.resultadoId ?? evaluacion.id,
  estadoResultado: 'PENDIENTE_VALIDACION',
  versionFormularioId: evaluacion.versionFormularioId ?? null,
  calificacionId: null,
  revision: null,
  versionReglas: null,
  idClave: null,
  idBaremo: null,
  factores: [],
});

/**
 * Cliente de E9 para la demostración: si la evaluación existe en la API simulada de BFA,
 * responde con su perfil; si no, delega en el mock general de resultados.
 */
export function crearClienteResultadosBfa(
  api: BfaApi,
  respaldo: ClienteResultados,
  revision: Pick<RevisionSimulada, 'revisionVigente'> | undefined = api instanceof BfaApiSimulada
    ? revisionSimuladaDe(api)
    : undefined,
): ClienteResultados {
  return {
    async obtenerResultado(evaluacionId) {
      let evaluacion: EvaluacionResponse;
      try {
        evaluacion = await api.obtenerEvaluacion(evaluacionId);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404)
          return respaldo.obtenerResultado(evaluacionId);
        throw e;
      }
      if (evaluacion.estado !== 'FINALIZADA') {
        throw new ApiError(409, {
          timestamp: new Date().toISOString(),
          status: 409,
          codigo: 'EVALUACION_NO_FINALIZADA',
          mensaje: 'La evaluación aún no ha finalizado.',
          ruta: `/api/v1/evaluaciones/${evaluacionId}/resultados`,
        });
      }
      const vigente = (await revision?.revisionVigente(evaluacionId)) ?? null;
      if (vigente === null) return resultadoPendienteSimulado(evaluacion);
      return resultadoBfaSimulado(evaluacion, await api.obtenerTest(evaluacion.testId), vigente);
    },
  };
}
