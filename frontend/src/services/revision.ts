import type { BorradorRevision, ClienteRevision } from '../features/bfa/revision/tipos';
import type { PreguntasSubpruebaResponse } from '../features/bfa/api/tipos';
import type { ResultadoResponse } from '../features/resultados/tipos';
import { http } from './http';

const json = (cuerpo: unknown): RequestInit => ({ body: JSON.stringify(cuerpo) });

/** Llamadas reales de BFA-FE-09 a /api/v1 (DOC-05). Se usan con VITE_USAR_MOCKS=false. */
export const servicioRevision: ClienteRevision = {
  // SUPUESTO: no hay un endpoint de listado para revisar; se arma con E9 (revisión vigente) y E6 (palabras).
  // Sin decisiones guardadas en E6 todas llegan PENDIENTE y respuestaId se toma de ordenEntrada.
  async cargar(evaluacionId): Promise<BorradorRevision> {
    const [resultado, fv] = await Promise.all([
      http<ResultadoResponse>(`/evaluaciones/${evaluacionId}/resultados`),
      http<PreguntasSubpruebaResponse>(`/evaluaciones/${evaluacionId}/subpruebas/FV/preguntas`),
    ]);
    return {
      calificacionId: resultado.calificacionId,
      revision: resultado.revision,
      revisionVigente: resultado.revision,
      palabras: (fv.palabras ?? []).map((p) => ({
        respuestaId: p.ordenEntrada,
        ordenEntrada: p.ordenEntrada,
        texto: p.texto,
        decision: 'PENDIENTE',
        motivo: null,
      })),
    };
  },
  /** E10 */
  revisarPalabra: (evaluacionId, calificacionId, respuestaId, cuerpo) =>
    http(
      `/evaluaciones/${evaluacionId}/calificaciones/${calificacionId}/palabras/${respuestaId}/revision`,
      { method: 'PUT', ...json(cuerpo) },
    ),
  /** E11 */
  recalcular: (evaluacionId, cuerpo) =>
    http(`/evaluaciones/${evaluacionId}/recalculos`, { method: 'POST', ...json(cuerpo) }),
  /** E12 */
  publicar: (evaluacionId, cuerpo) =>
    http(`/evaluaciones/${evaluacionId}/resultados/vigente`, { method: 'PUT', ...json(cuerpo) }),
};
