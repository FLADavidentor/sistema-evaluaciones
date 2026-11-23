import { ITEMS_POR_LAMINA, TOTAL_ITEMS } from './tipos';

/** Lámina (1–5) y posición en ella (1–12) a partir del orden global (1–60). */
export function ubicarItem(orden: number): { lamina: number; posicion: number } {
  return {
    lamina: 1 + Math.floor((orden - 1) / ITEMS_POR_LAMINA),
    posicion: 1 + ((orden - 1) % ITEMS_POR_LAMINA),
  };
}

export const esOrdenValido = (orden: number) =>
  Number.isInteger(orden) && orden >= 1 && orden <= TOTAL_ITEMS;

export const contarRespondidos = (respuestas: Record<number, number>) =>
  Object.keys(respuestas).length;
