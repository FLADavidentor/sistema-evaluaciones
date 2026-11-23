import { createContext, useContext } from 'react';
import type { InicioSesionRequest, Sesion } from './tipos';

export interface ContextoSesion {
  /** null mientras nadie ha iniciado sesión. */
  sesion: Sesion | null;
  iniciar(solicitud: InicioSesionRequest): Promise<void>;
  cerrar(): Promise<void>;
}

export const SesionContexto = createContext<ContextoSesion | null>(null);

export function useSesion(): ContextoSesion {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error('useSesion requiere <SesionProveedor>.');
  return contexto;
}

const CLAVE = 'sesion-evaluaciones';

/** La sesión sobrevive a recargar la página, pero no al cerrar la pestaña. */
export function leerSesionGuardada(): Sesion | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    const sesion = JSON.parse(crudo) as Sesion;
    return new Date(sesion.expiraEn).getTime() > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento la sesión dura lo que la página.
  }
}
