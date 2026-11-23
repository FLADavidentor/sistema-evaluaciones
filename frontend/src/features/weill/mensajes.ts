import { ApiError } from '../../services/http';

/** Texto de error para la persona evaluada. */
export function mensajeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'No hay conexión con el servidor. Intente de nuevo.';
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}
