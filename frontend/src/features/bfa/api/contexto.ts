import { createContext, useContext } from 'react';
import { bfaApiHttp, type BfaApi } from './bfaApi';
import { crearApiSimulada } from './bfaApiSimulada';

/**
 * API por defecto. Mientras no haya endpoints de negocio, en desarrollo se usa la simulada;
 * `VITE_BFA_API=real` fuerza el backend real y `VITE_BFA_API=simulada` la simulada en cualquier modo.
 */
function crearApiPorDefecto(): BfaApi {
  const modo = import.meta.env.VITE_BFA_API as string | undefined;
  const simulada = modo ? modo === 'simulada' : import.meta.env.DEV;
  return simulada ? crearApiSimulada() : bfaApiHttp;
}

export const BfaApiContext = createContext<BfaApi>(crearApiPorDefecto());

export function useBfaApi(): BfaApi {
  return useContext(BfaApiContext);
}
