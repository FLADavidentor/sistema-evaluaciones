import type { BfaApiSimulada } from '../features/bfa/api/bfaApiSimulada';
import type {
  BorradorRevision,
  ClienteRevision,
  DecisionPalabra,
  PublicacionResponse,
  RecalculoResponse,
  RevisionPalabraResponse,
} from '../features/bfa/revision/tipos';
import { ApiError } from './http';

/**
 * Simulación de E10, E11 y E12 para desarrollar sin backend (BFA-FE-09). Hace de servidor sobre
 * las palabras de FV de la API simulada de BFA. Una evaluación finalizada empieza con la revisión 1
 * como candidata y sin revisión vigente: E9 responde PENDIENTE_VALIDACION hasta publicar (E12).
 */

interface EstadoRevision {
  /** Revisión candidata (la que se está revisando). */
  revision: number;
  vigente: number | null;
  decisiones: Map<number, { decision: DecisionPalabra; motivo: string }>;
  solicitudes: Map<string, RecalculoResponse>;
  siguienteDecision: number;
}

const DECISIONES: DecisionPalabra[] = ['VALIDA', 'INVALIDA', 'PENDIENTE'];

/** Identificadores ficticios y deterministas. */
export const calificacionDe = (evaluacionId: number, revision: number) =>
  900 + evaluacionId + (revision - 1) * 1000;
const respuestaDe = (evaluacionId: number, ordenEntrada: number) =>
  5000 + evaluacionId * 100 + ordenEntrada;

function fallar(status: number, codigo: string, mensaje: string, ruta: string): never {
  throw new ApiError(status, {
    timestamp: new Date().toISOString(),
    status,
    codigo,
    mensaje,
    ruta,
  });
}

export class RevisionSimulada implements ClienteRevision {
  private readonly estados = new Map<number, EstadoRevision>();

  constructor(
    private readonly api: BfaApiSimulada,
    private readonly retardoMs = 300,
  ) {}

  /** Revisión publicada como vigente (nula si aún no se publicó): la usa el E9 simulado. */
  async revisionVigente(evaluacionId: number): Promise<number | null> {
    return (await this.estado(evaluacionId, '/resultados')).vigente;
  }

  private async estado(evaluacionId: number, sufijo: string): Promise<EstadoRevision> {
    const ruta = `/api/v1/evaluaciones/${evaluacionId}${sufijo}`;
    const evaluacion = await this.api.obtenerEvaluacion(evaluacionId);
    if (evaluacion.estado !== 'FINALIZADA')
      fallar(409, 'EVALUACION_NO_FINALIZADA', 'La evaluación aún no ha finalizado.', ruta);
    let estado = this.estados.get(evaluacionId);
    if (!estado) {
      estado = {
        revision: 1,
        vigente: null,
        decisiones: new Map(),
        solicitudes: new Map(),
        siguienteDecision: 1,
      };
      this.estados.set(evaluacionId, estado);
    }
    return estado;
  }

  private esperar = () => new Promise<void>((resolver) => setTimeout(resolver, this.retardoMs));

  async cargar(evaluacionId: number): Promise<BorradorRevision> {
    await this.esperar();
    const estado = await this.estado(evaluacionId, '/resultados');
    return {
      calificacionId: calificacionDe(evaluacionId, estado.revision),
      revision: estado.revision,
      revisionVigente: estado.vigente,
      palabras: this.api.palabrasFv(evaluacionId).map((p) => {
        const respuestaId = respuestaDe(evaluacionId, p.ordenEntrada);
        const d = estado.decisiones.get(respuestaId);
        return {
          respuestaId,
          ordenEntrada: p.ordenEntrada,
          texto: p.texto,
          decision: d?.decision ?? 'PENDIENTE',
          motivo: d?.motivo ?? null,
        };
      }),
    };
  }

  async revisarPalabra(
    evaluacionId: number,
    calificacionId: number,
    respuestaId: number,
    cuerpo: { decision: DecisionPalabra; motivo: string },
  ): Promise<RevisionPalabraResponse> {
    await this.esperar();
    const ruta = `/api/v1/evaluaciones/${evaluacionId}/calificaciones/${calificacionId}/palabras/${respuestaId}/revision`;
    const estado = await this.estado(evaluacionId, '/calificaciones');
    if (!DECISIONES.includes(cuerpo.decision) || cuerpo.motivo.trim() === '')
      fallar(400, 'SOLICITUD_INVALIDA', 'Indique la decisión y el motivo.', ruta);
    if (calificacionId !== calificacionDe(evaluacionId, estado.revision))
      fallar(404, 'CALIFICACION_NO_ENCONTRADA', 'La calificación no existe.', ruta);
    if (estado.vigente === estado.revision)
      fallar(409, 'REVISION_COMPLETADA', 'La revisión ya se publicó; solicite un recálculo.', ruta);
    const existe = this.api
      .palabrasFv(evaluacionId)
      .some((p) => respuestaDe(evaluacionId, p.ordenEntrada) === respuestaId);
    if (!existe)
      fallar(
        422,
        'RESPUESTA_NO_FV',
        'La respuesta no es de Fluidez Verbal de esta evaluación.',
        ruta,
      );
    // Repetir una decisión no duplica la pareja calificación-respuesta.
    estado.decisiones.set(respuestaId, { decision: cuerpo.decision, motivo: cuerpo.motivo.trim() });
    return {
      idRevisionPalabra: estado.siguienteDecision++,
      calificacionId,
      respuestaId,
      decision: cuerpo.decision,
      origenDecision: 'REVISION_AUTORIZADA',
      fechaDecision: new Date().toISOString(),
    };
  }

  async recalcular(
    evaluacionId: number,
    cuerpo: { motivo: string; idSolicitud?: string },
  ): Promise<RecalculoResponse> {
    await this.esperar();
    const ruta = `/api/v1/evaluaciones/${evaluacionId}/recalculos`;
    const estado = await this.estado(evaluacionId, '/recalculos');
    if (cuerpo.motivo.trim() === '')
      fallar(400, 'SOLICITUD_INVALIDA', 'El motivo es obligatorio.', ruta);
    // Reenviar la misma solicitud devuelve la misma revisión.
    const previa = cuerpo.idSolicitud && estado.solicitudes.get(cuerpo.idSolicitud);
    if (previa) return { ...previa };
    estado.revision += 1;
    const respuesta: RecalculoResponse = {
      resultadoId: evaluacionId,
      calificacionId: calificacionDe(evaluacionId, estado.revision),
      revision: estado.revision,
      estadoCalculo: 'CALCULADO',
    };
    if (cuerpo.idSolicitud) estado.solicitudes.set(cuerpo.idSolicitud, respuesta);
    return { ...respuesta };
  }

  async publicar(
    evaluacionId: number,
    cuerpo: {
      calificacionId: number;
      motivo: string;
      revisionVigenteEsperada: number | null;
      audiencia: string[];
    },
  ): Promise<PublicacionResponse> {
    await this.esperar();
    const ruta = `/api/v1/evaluaciones/${evaluacionId}/resultados/vigente`;
    const estado = await this.estado(evaluacionId, '/resultados/vigente');
    if (cuerpo.motivo.trim() === '' || cuerpo.audiencia.length === 0)
      fallar(400, 'SOLICITUD_INVALIDA', 'Indique el motivo y la audiencia.', ruta);
    if (cuerpo.calificacionId !== calificacionDe(evaluacionId, estado.revision))
      fallar(404, 'CALIFICACION_NO_ENCONTRADA', 'La calificación no existe.', ruta);
    const publicada = (): PublicacionResponse => ({
      resultadoId: evaluacionId,
      calificacionId: cuerpo.calificacionId,
      revision: estado.revision,
      estadoResultado: 'DISPONIBLE',
    });
    // Repetir una publicación ya efectuada no duplica el cambio.
    if (estado.vigente === estado.revision) return publicada();
    if (cuerpo.revisionVigenteEsperada !== estado.vigente)
      fallar(409, 'REVISION_VIGENTE_CAMBIO', 'La revisión vigente cambió; recargue.', ruta);
    const pendiente = this.api
      .palabrasFv(evaluacionId)
      .some(
        (p) =>
          !estado.decisiones.has(respuestaDe(evaluacionId, p.ordenEntrada)) ||
          estado.decisiones.get(respuestaDe(evaluacionId, p.ordenEntrada))?.decision ===
            'PENDIENTE',
      );
    if (pendiente) fallar(409, 'REVISION_NO_PUBLICABLE', 'Quedan palabras sin decisión.', ruta);
    estado.vigente = estado.revision;
    return publicada();
  }
}

const porApi = new WeakMap<BfaApiSimulada, RevisionSimulada>();

/** Una sola simulación por API simulada: la comparten la página de revisión y el E9 simulado. */
export function revisionSimuladaDe(api: BfaApiSimulada): RevisionSimulada {
  let revision = porApi.get(api);
  if (!revision) {
    revision = new RevisionSimulada(api);
    porApi.set(api, revision);
  }
  return revision;
}
