/**
 * Contratos de BFA-FE-09: revisión de Fluidez Verbal (E10), recálculo (E11) y publicación (E12).
 * Los DTO siguen docs/api/openapi.yaml; los nombres se ajustan aquí si DOC-05 cambia.
 */

export type DecisionPalabra = 'VALIDA' | 'INVALIDA' | 'PENDIENTE';

/** E10 — PUT .../calificaciones/{calificacionId}/palabras/{respuestaId}/revision */
export interface RevisionPalabraRequest {
  decision: DecisionPalabra;
  motivo: string;
}

export interface RevisionPalabraResponse {
  idRevisionPalabra: number;
  calificacionId: number;
  respuestaId: number;
  decision: DecisionPalabra;
  origenDecision: string;
  fechaDecision: string;
}

/** E11 — POST .../recalculos. idSolicitud evita duplicados (pendiente de confirmar en DOC-05). */
export interface RecalculoRequest {
  motivo: string;
  versionReglas?: string;
  idClave?: number;
  idBaremo?: number;
  idSolicitud?: string;
}

export interface RecalculoResponse {
  resultadoId: number;
  calificacionId: number;
  revision: number;
  estadoCalculo: string;
}

/** E12 — PUT .../resultados/vigente */
export interface PublicarRevisionRequest {
  calificacionId: number;
  motivo: string;
  /** Nula en la primera publicación. */
  revisionVigenteEsperada: number | null;
  audiencia: string[];
}

export interface PublicacionResponse {
  resultadoId: number;
  calificacionId: number;
  revision: number;
  estadoResultado: string;
}

/** Palabra de FV tal como se muestra a quien revisa; el texto original no se modifica. */
export interface PalabraRevision {
  respuestaId: number;
  ordenEntrada: number;
  texto: string;
  decision: DecisionPalabra;
  motivo: string | null;
}

/** Estado de la revisión candidata de una evaluación. */
export interface BorradorRevision {
  /** Nulo si aún no existe una revisión candidata (sin E11 previo). */
  calificacionId: number | null;
  revision: number | null;
  /** Revisión publicada como vigente, si hay. */
  revisionVigente: number | null;
  palabras: PalabraRevision[];
}

/** Puerto: lo implementan el servicio real y el mock. */
export interface ClienteRevision {
  cargar(evaluacionId: number): Promise<BorradorRevision>;
  revisarPalabra(
    evaluacionId: number,
    calificacionId: number,
    respuestaId: number,
    cuerpo: RevisionPalabraRequest,
  ): Promise<RevisionPalabraResponse>;
  recalcular(evaluacionId: number, cuerpo: RecalculoRequest): Promise<RecalculoResponse>;
  publicar(evaluacionId: number, cuerpo: PublicarRevisionRequest): Promise<PublicacionResponse>;
}
