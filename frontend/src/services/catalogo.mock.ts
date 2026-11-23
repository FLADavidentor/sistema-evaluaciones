import type {
  ClienteCatalogo,
  TestDetalleResponse,
  TestResumenResponse,
} from '../features/evaluacion/tipos';
import { TEST_BFA, escenarioPorId, fallar, fallarConexion } from './evaluacion.mock';

/**
 * Simulación de E1 y E2 (catálogo) con los datos ficticios de DOC-05.
 * Cumple el mismo contrato que el servicio real para cambiarla sin tocar la interfaz.
 *
 * E1 (lista), según el escenario elegido al crear el mock:
 *   normal       → BFA y un test activo sin edición publicada
 *   vacio        → lista vacía (sin tests activos)
 *   sin-permiso  → 403 SIN_PERMISO
 *   error        → 500 ERROR_INTERNO
 *   sin-conexion → fallo de conexión
 *
 * E2 (detalle), por valor de testId:
 *   1            → BFA con sus 13 subpruebas
 *   2            → existe en la lista pero no tiene edición publicada: 404 (hallazgo de Testing
 *                  en el PR #51; el contrato lo define como "tests activos")
 *   403 / 500    → SIN_PERMISO / ERROR_INTERNO
 *   503          → fallo de conexión
 *   cualquier otro → TEST_NO_ENCONTRADO
 */

const TEST_SIN_EDICION: TestResumenResponse = {
  id: 2,
  codigo: 'WEILL',
  nombre: 'Test de inteligencia de Weill',
  numeroSubpruebas: 0,
};

const RESUMEN_BFA: TestResumenResponse = {
  id: TEST_BFA.id,
  codigo: TEST_BFA.codigo,
  nombre: TEST_BFA.nombre,
  numeroSubpruebas: TEST_BFA.subpruebas.length,
};

export type EscenarioCatalogo = 'normal' | 'vacio' | 'sin-permiso' | 'error' | 'sin-conexion';

export interface OpcionesCatalogoMock {
  /** Retardo artificial en ms (0 en pruebas). */
  retardoMs?: number;
  /** Resultado de E1; E2 se comporta igual en todos los escenarios. */
  escenario?: EscenarioCatalogo;
}

export function crearCatalogoMock({
  retardoMs = 700,
  escenario = 'normal',
}: OpcionesCatalogoMock = {}): ClienteCatalogo {
  const esperar = () => new Promise<void>((resolver) => setTimeout(resolver, retardoMs));

  return {
    async listarTests(): Promise<TestResumenResponse[]> {
      await esperar();
      const ruta = '/api/v1/tests';
      if (escenario === 'sin-conexion') fallarConexion();
      if (escenario === 'sin-permiso')
        fallar(403, 'SIN_PERMISO', 'No tiene permiso para este recurso.', ruta);
      if (escenario === 'error') fallar(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado.', ruta);
      return structuredClone(escenario === 'vacio' ? [] : [RESUMEN_BFA, TEST_SIN_EDICION]);
    },

    async obtenerTest(testId: number): Promise<TestDetalleResponse> {
      await esperar();
      const ruta = `/api/v1/tests/${testId}`;
      escenarioPorId(testId, ruta);
      if (testId !== TEST_BFA.id)
        fallar(404, 'TEST_NO_ENCONTRADO', 'El test no existe o no tiene edición publicada.', ruta);
      return structuredClone(TEST_BFA);
    },
  };
}
