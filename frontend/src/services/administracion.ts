import type { ClienteAdministracion } from '../features/administracion/tipos';
import type { TestDetalleResponse, TestResumenResponse } from '../features/evaluacion/tipos';
import { http } from './http';

const enviar = (metodo: 'POST' | 'PUT', cuerpo?: unknown): RequestInit => ({
  method: metodo,
  ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
});

/**
 * Llamadas reales de GEN-07 a /api/v1 (DOC-05, E1, E2 y E25–E31). Se usan con VITE_USAR_MOCKS=false.
 */
export const servicioAdministracion: ClienteAdministracion = {
  listarTests: () => http<TestResumenResponse[]>('/tests'),
  obtenerTest: (testId) => http<TestDetalleResponse>(`/tests/${testId}`),
  crearVersion: (testId) => http(`/tests/${testId}/versiones`, enviar('POST')),
  guardarConfiguracion: (versionId, codigo, solicitud) =>
    http(
      `/versiones/${versionId}/configuraciones/${encodeURIComponent(codigo)}`,
      enviar('PUT', solicitud),
    ),
  agregarPregunta: (versionId, codigo, solicitud) =>
    http(
      `/versiones/${versionId}/configuraciones/${encodeURIComponent(codigo)}/preguntas`,
      enviar('POST', solicitud),
    ),
  guardarOpciones: (versionId, preguntaId, solicitud) =>
    http(`/versiones/${versionId}/preguntas/${preguntaId}/opciones`, enviar('PUT', solicitud)),
  cargarClave: (versionId, solicitud) =>
    http(`/versiones/${versionId}/clave`, enviar('PUT', solicitud)),
  cargarBaremo: (solicitud) => http('/baremos', enviar('POST', solicitud)),
  publicar: (versionId) => http(`/versiones/${versionId}/publicar`, enviar('POST')),
};
