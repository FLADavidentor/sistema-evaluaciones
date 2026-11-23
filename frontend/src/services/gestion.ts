import type { ClienteGestion } from '../features/evaluacion/gestion/tipos';
import type {
  EvaluacionResponse,
  PeriodoResponse,
  SujetoResponse,
} from '../features/evaluacion/tipos';
import { http } from './http';

/** Llamadas reales de E18–E23 (DOC-05). Se usan con VITE_USAR_MOCKS=false. */
export const servicioGestion: ClienteGestion = {
  /** E18 */
  registrarSujeto: (solicitud) =>
    http<SujetoResponse>('/sujetos', { method: 'POST', body: JSON.stringify(solicitud) }),

  /** E23 */
  buscarSujeto: (identificador) =>
    http<SujetoResponse[]>(
      `/sujetos?identificadorInstitucional=${encodeURIComponent(identificador)}`,
    ),

  /** E20 */
  crearPeriodo: (solicitud) =>
    http<PeriodoResponse>('/periodos', { method: 'POST', body: JSON.stringify(solicitud) }),

  /** E21 */
  listarPeriodos: () => http<PeriodoResponse[]>('/periodos'),

  /** E22 */
  listarEvaluaciones: (filtro = {}) => {
    const consulta = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtro))
      if (valor !== undefined) consulta.set(clave, String(valor));
    const texto = consulta.toString();
    return http<EvaluacionResponse[]>(`/evaluaciones${texto ? `?${texto}` : ''}`);
  },
};
