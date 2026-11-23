import { usaMocks } from '../../evaluacion/cliente';
import { crearCatalogoMock } from '../../../services/catalogo.mock';
import type { TestDetalleResponse, TestResumenResponse } from '../types/catalogo.types';
import { listarTests, obtenerTest } from './catalogoService';

/** Puerto de E1/E2 que usa la página; lo cumplen el servicio real y el mock (#81). */
export interface ClienteCatalogoPagina {
  listarTests(): Promise<TestResumenResponse[]>;
  obtenerTest(testId: number): Promise<TestDetalleResponse>;
}

/** Misma bandera que GEN-02 (VITE_USAR_MOCKS): con mocks se usa la simulación de E1 y E2. */
export const clienteCatalogo: ClienteCatalogoPagina = usaMocks
  ? crearCatalogoMock()
  : { listarTests, obtenerTest };
