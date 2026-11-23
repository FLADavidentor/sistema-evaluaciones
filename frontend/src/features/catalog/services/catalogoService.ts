/**
 * Servicios HTTP para el catálogo de tests.
 *
 * Fuente: Contrato REST GEN-01 (PR #37).
 */

import { http } from '../../../services/http';

import type { TestResumenResponse, TestDetalleResponse } from '../types/catalogo.types';

/**
 * Consulta los tests activos disponibles en el catálogo.
 *
 * GET /api/v1/tests
 *
 * @returns Lista de tests disponibles.
 */
export async function listarTests(): Promise<TestResumenResponse[]> {
  return http<TestResumenResponse[]>('/tests');
}

/**
 * Consulta el detalle de un test y sus subpruebas.
 *
 * GET /api/v1/tests/{testId}
 *
 * @param testId Identificador del test.
 * @returns Información detallada del test.
 */
export async function obtenerTest(testId: number): Promise<TestDetalleResponse> {
  return http<TestDetalleResponse>(`/tests/${encodeURIComponent(String(testId))}`);
}
