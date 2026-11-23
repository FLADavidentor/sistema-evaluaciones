import type { EstadoResultado, ResultadoWeill } from './tipos';

export const NO_CALCULADO = 'no calculado';

export const ETIQUETAS_ESTADO: Record<EstadoResultado, string> = {
  CALCULANDO: 'Calculando',
  PENDIENTE_VALIDACION: 'Pendiente de validación',
  DISPONIBLE: 'Disponible',
};

/** Muestra el valor tal como llega; null se ve como «no calculado». */
export const mostrar = (valor: string | number | null) =>
  valor === null ? NO_CALCULADO : String(valor);

/** Filas de la vista del psicólogo, en el orden de DOC-06. */
export function filasResultado(r: ResultadoWeill): [string, string][] {
  return [
    ['Puntaje directo (0–60)', mostrar(r.puntajeDirecto)],
    ...r.subtotales.map((s): [string, string] => [
      `Subtotal lámina ${s.lamina}`,
      mostrar(s.puntaje),
    ]),
    ['Grupo de baremo', mostrar(r.grupoBaremo)],
    ['Percentil', mostrar(r.percentil)],
    ['CI', mostrar(r.ci)],
    ['Categoría', mostrar(r.categoria)],
    ['Versión de clave', mostrar(r.versionClave)],
    ['Versión de baremo', mostrar(r.versionBaremo)],
  ];
}
