import type { ClienteGestion } from '../features/evaluacion/gestion/tipos';
import type { PeriodoResponse, SujetoResponse } from '../features/evaluacion/tipos';
import { evaluacionesIniciales, fallar, PERIODOS, SUJETOS } from './evaluacion.mock';

/**
 * Simulación de E18–E23 con los datos ficticios de DOC-05 (mismas semillas que el mock de evaluación).
 * Escenarios:
 *   Buscar 2026-0153 / 2026-0154 / 2026-0409 → existen; cualquier otro → lista vacía
 *   Registrar un identificador existente      → 409 SUJETO_DUPLICADO
 *   Crear un período con código existente     → 409 PERIODO_DUPLICADO
 *   Período con inicio posterior al fin       → 422 PERIODO_INVALIDO
 */
const copiar = <T>(valor: T): T => structuredClone(valor);

export function crearClienteGestionMock({ retardoMs = 500 }: { retardoMs?: number } = {}) {
  const sujetos: SujetoResponse[] = copiar(SUJETOS);
  const periodos: PeriodoResponse[] = copiar(PERIODOS);
  const evaluaciones = evaluacionesIniciales();
  let siguienteSujeto = 1000;
  let siguientePeriodo = 100;
  const esperar = () => new Promise<void>((resolver) => setTimeout(resolver, retardoMs));

  const cliente: ClienteGestion = {
    async registrarSujeto(solicitud) {
      await esperar();
      const ruta = '/api/v1/sujetos';
      const identificador = solicitud.identificadorInstitucional.trim();
      if (!identificador || !solicitud.nombres.trim() || !solicitud.apellidos.trim())
        fallar(400, 'SOLICITUD_INVALIDA', 'La solicitud tiene datos inválidos.', ruta);
      if (sujetos.some((s) => s.identificadorInstitucional === identificador))
        fallar(409, 'SUJETO_DUPLICADO', 'Ya existe una persona con ese identificador.', ruta);
      const nuevo: SujetoResponse = {
        id: siguienteSujeto++,
        identificadorInstitucional: identificador,
        nombres: solicitud.nombres.trim(),
        apellidos: solicitud.apellidos.trim(),
      };
      sujetos.push(nuevo);
      return copiar(nuevo);
    },

    async buscarSujeto(identificador) {
      await esperar();
      return copiar(sujetos.filter((s) => s.identificadorInstitucional === identificador.trim()));
    },

    async crearPeriodo(solicitud) {
      await esperar();
      const ruta = '/api/v1/periodos';
      const codigo = solicitud.codigo.trim();
      if (!codigo || !solicitud.denominacion.trim() || !solicitud.inicio || !solicitud.fin)
        fallar(400, 'SOLICITUD_INVALIDA', 'La solicitud tiene datos inválidos.', ruta);
      if (periodos.some((p) => p.codigo === codigo))
        fallar(409, 'PERIODO_DUPLICADO', 'Ya existe un período con ese código.', ruta);
      if (solicitud.inicio > solicitud.fin)
        fallar(422, 'PERIODO_INVALIDO', 'El inicio no puede ser posterior al fin.', ruta);
      const nuevo: PeriodoResponse = {
        id: siguientePeriodo++,
        codigo,
        denominacion: solicitud.denominacion.trim(),
        inicio: solicitud.inicio,
        fin: solicitud.fin,
        disponible: solicitud.fin >= new Date().toISOString().slice(0, 10),
      };
      periodos.push(nuevo);
      return copiar(nuevo);
    },

    async listarPeriodos() {
      await esperar();
      return copiar(periodos);
    },

    async listarEvaluaciones(filtro = {}) {
      await esperar();
      return copiar(
        evaluaciones.filter(
          (e) =>
            (filtro.sujetoId === undefined || e.sujetoId === filtro.sujetoId) &&
            (filtro.testId === undefined || e.testId === filtro.testId) &&
            (filtro.periodoId === undefined || e.periodoId === filtro.periodoId) &&
            (filtro.estado === undefined || e.estado === filtro.estado),
        ),
      );
    },
  };
  return cliente;
}
