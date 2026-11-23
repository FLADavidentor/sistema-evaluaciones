import type { EstadoEvaluacion, EvaluacionResponse, PeriodoResponse, SujetoResponse } from '../tipos';

// Tipos de GEN-02-FE (gestión) según DOC-05: E18–E23.

/** E18 — fechaNacimiento solo cuando la aplicación la requiere. */
export interface SujetoRequest {
  identificadorInstitucional: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string;
}

/** E20 */
export interface PeriodoRequest {
  codigo: string;
  denominacion: string;
  inicio: string;
  fin: string;
}

/** Filtros opcionales de E22. */
export interface FiltroEvaluaciones {
  sujetoId?: number;
  testId?: number;
  periodoId?: number;
  estado?: EstadoEvaluacion;
}

export interface ClienteGestion {
  /** E18 */
  registrarSujeto(solicitud: SujetoRequest): Promise<SujetoResponse>;
  /** E23 — 0 o 1 elemento. */
  buscarSujeto(identificadorInstitucional: string): Promise<SujetoResponse[]>;
  /** E20 */
  crearPeriodo(solicitud: PeriodoRequest): Promise<PeriodoResponse>;
  /** E21 — todos los autorizados. */
  listarPeriodos(): Promise<PeriodoResponse[]>;
  /** E22 */
  listarEvaluaciones(filtro?: FiltroEvaluaciones): Promise<EvaluacionResponse[]>;
}
