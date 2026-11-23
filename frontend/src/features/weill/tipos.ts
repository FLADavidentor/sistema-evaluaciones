/**
 * Tipos del módulo Weill (Prueba No Verbal, Forma A) según los borradores DOC-02 v04,
 * DOC-03, DOC-05 y DOC-06. Las rutas HTTP aún no existen (DOC-09).
 */

export const TOTAL_ITEMS = 60;
export const ITEMS_POR_LAMINA = 12;
export const TOTAL_LAMINAS = 5;
export const TOTAL_PIEZAS = 8;

export type EstadoIntento = 'EN_CURSO' | 'FINALIZADO';

export interface IntentoWeill {
  id: number;
  forma: 'A';
  estado: EstadoIntento;
  fechaInicio: string;
  fechaFin: string | null;
  /** Sin límite por defecto; con null no se muestra reloj. */
  finLimite: string | null;
  /** H-08 pendiente: por defecto se permite volver al ítem anterior. */
  permitirRetroceso: boolean;
  /** Pieza elegida (1–8) por orden de ítem (1–60); los omitidos no aparecen. */
  respuestas: Record<number, number>;
}

export interface RespuestaWeill {
  intentoId: number;
  orden: number;
  /** null = respuesta quitada (ítem pendiente). */
  pieza: number | null;
  guardadaEn: string;
}

/** Constancia de finalización: sin puntaje. */
export interface ConstanciaWeill {
  intentoId: number;
  fechaFin: string;
  respondidos: number;
  omitidos: number;
}

export type EstadoResultado = 'CALCULANDO' | 'PENDIENTE_VALIDACION' | 'DISPONIBLE';

/** Vista del psicólogo; el cliente no calcula nada, solo muestra lo recibido. */
export interface ResultadoWeill {
  intentoId: number;
  estado: EstadoResultado;
  puntajeDirecto: number | null;
  subtotales: { lamina: number; puntaje: number | null }[];
  grupoBaremo: string | null;
  percentil: number | null;
  ci: number | null;
  categoria: string | null;
  versionClave: string | null;
  versionBaremo: string | null;
}

/** Material de un ítem: la figura y las 8 piezas en el orden mostrado (pieza = número 1–8). */
export interface ItemWeill {
  orden: number;
  figuraUrl: string;
  piezas: { pieza: number; url: string }[];
}

export interface ClienteWeill {
  /** Intento EN_CURSO para retomarlo, o null si no hay. */
  obtenerIntentoEnCurso(): Promise<IntentoWeill | null>;
  iniciarIntento(): Promise<IntentoWeill>;
  obtenerIntento(intentoId: number): Promise<IntentoWeill>;
  obtenerItem(intentoId: number, orden: number): Promise<ItemWeill>;
  /** Guarda (o quita con pieza null) la respuesta de un ítem. */
  guardarRespuesta(intentoId: number, orden: number, pieza: number | null): Promise<RespuestaWeill>;
  finalizarIntento(intentoId: number): Promise<ConstanciaWeill>;
  obtenerConstancia(intentoId: number): Promise<ConstanciaWeill>;
  obtenerResultado(intentoId: number): Promise<ResultadoWeill>;
}
