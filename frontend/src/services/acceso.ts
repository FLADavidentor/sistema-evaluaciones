import type {
  ClienteAcceso,
  CuentaResponse,
  RegistroRequest,
  SesionResponse,
} from '../features/acceso/tipos';
import { http } from './http';

/** Llamadas reales de GEN-06 a /api/v1/auth (DOC-05). Se usan con VITE_USAR_MOCKS=false. */
export const servicioAcceso: ClienteAcceso = {
  /** E13 */
  registrar: (solicitud: RegistroRequest) =>
    http<CuentaResponse>('/auth/registro', { method: 'POST', body: JSON.stringify(solicitud) }),

  /** E14 */
  iniciarSesion: (solicitud) =>
    http<SesionResponse>('/auth/sesion', { method: 'POST', body: JSON.stringify(solicitud) }),

  /** E15 — 204 sin cuerpo. */
  cerrarSesion: () => http<void>('/auth/sesion', { method: 'DELETE' }),

  /** E16 — 202 sin cuerpo. */
  pedirRecuperacion: (solicitud) =>
    http<void>('/auth/recuperacion', { method: 'POST', body: JSON.stringify(solicitud) }),

  /** E17 — 204 sin cuerpo. */
  confirmarRecuperacion: (solicitud) =>
    http<void>('/auth/recuperacion/confirmar', { method: 'POST', body: JSON.stringify(solicitud) }),
};
