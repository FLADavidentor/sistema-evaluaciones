/** Cuerpo de error común del backend (Documento general §5.2.2). */
export interface ErrorApi {
  timestamp: string;
  status: number;
  codigo: string;
  mensaje: string;
  ruta: string;
  detalles?: { campo: string; mensaje: string }[];
}

/** Error de una llamada a la API. `error` trae el cuerpo del backend cuando lo hay; el frontend decide por `error.codigo`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly error?: ErrorApi,
  ) {
    super(error?.mensaje ?? `HTTP ${status}`);
  }
}

let token: string | null = null;

/** Token de la sesión abierta (E14); se envía como Bearer en las demás llamadas. */
export function establecerToken(nuevo: string | null) {
  token = nuevo;
}

/** Única puerta a la API: rutas relativas a /api/v1 y JSON en ambos sentidos. */
export async function http<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`/api/v1${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  const cuerpo =
    respuesta.status === 204 ? undefined : await respuesta.json().catch(() => undefined);
  if (!respuesta.ok) throw new ApiError(respuesta.status, cuerpo);
  return cuerpo as T;
}
