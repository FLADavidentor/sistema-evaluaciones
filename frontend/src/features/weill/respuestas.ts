import { TOTAL_ITEMS } from './tipos';

/** Estado visible de cada ítem; «guardado» solo tras la confirmación de la API. */
export type EstadoGuardado = 'pendiente' | 'guardando' | 'guardado' | 'error';

export interface ItemLocal {
  pieza: number | null;
  estado: EstadoGuardado;
}

export type ItemsLocales = Record<number, ItemLocal>;

const VACIO: ItemLocal = { pieza: null, estado: 'pendiente' };

export const itemLocal = (items: ItemsLocales, orden: number) => items[orden] ?? VACIO;

export function desdeServidor(respuestas: Record<number, number>): ItemsLocales {
  const items: ItemsLocales = {};
  for (const [orden, pieza] of Object.entries(respuestas))
    items[Number(orden)] = { pieza, estado: 'guardado' };
  return items;
}

/** Elegir otra pieza reemplaza; pieza null = quitar. */
export const solicitar = (items: ItemsLocales, orden: number, pieza: number | null) => ({
  ...items,
  [orden]: { pieza, estado: 'guardando' as const },
});

/** Aplica la respuesta de la API solo si sigue siendo la última elegida. */
export function resolver(
  items: ItemsLocales,
  orden: number,
  pieza: number | null,
  ok: boolean,
): ItemsLocales {
  const actual = itemLocal(items, orden);
  if (actual.pieza !== pieza || actual.estado !== 'guardando') return items;
  const estado: EstadoGuardado = !ok ? 'error' : pieza === null ? 'pendiente' : 'guardado';
  return { ...items, [orden]: { pieza, estado } };
}

export const contarGuardados = (items: ItemsLocales) =>
  Object.values(items).filter((i) => i.pieza !== null && i.estado === 'guardado').length;

/** Primer ítem sin respuesta (para retomar), o el último si todos tienen. */
export function primerPendiente(items: ItemsLocales): number {
  for (let orden = 1; orden <= TOTAL_ITEMS; orden++)
    if (itemLocal(items, orden).pieza === null) return orden;
  return TOTAL_ITEMS;
}

/** Hay guardados sin confirmar: no se debe finalizar todavía. */
export const hayGuardando = (items: ItemsLocales) =>
  Object.values(items).some((i) => i.estado === 'guardando');

/** Ítems cuya respuesta no se pudo guardar: impiden finalizar hasta reintentar. */
export const contarConError = (items: ItemsLocales) =>
  Object.values(items).filter((i) => i.estado === 'error').length;
