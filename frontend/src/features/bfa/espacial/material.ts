import { cubos, poligono, type Punto } from './figuras';

// Material FICTICIO de S1, S2 y S1b para desarrollar y probar la familia Espacial con la API
// simulada. No son reactivos del BFA ni llevan clave (E6 nunca devuelve la respuesta correcta).

export interface ItemFigura {
  enunciado: string;
  /** Figura modelo (`recursoUrl` de la pregunta). */
  estimulo: string;
  /** Una figura por alternativa (`recursoUrl` de cada opción). */
  opciones: string[];
}

const FLECHA: Punto[] = [
  [30, 30],
  [70, 30],
  [70, 18],
  [92, 40],
  [70, 62],
  [70, 50],
  [30, 50],
];
const ESCALON: Punto[] = [
  [36, 18],
  [60, 18],
  [60, 38],
  [84, 38],
  [84, 62],
  [36, 62],
];
const BANDERA: Punto[] = [
  [42, 14],
  [50, 14],
  [50, 22],
  [80, 30],
  [50, 40],
  [50, 66],
  [42, 66],
];

const IDENTICAS = 'Elige la figura idéntica al modelo.';
const DESPLAZADA = 'Elige la figura que es el modelo girado, sin darle vuelta.';
const LADRILLOS = 'Elige la pila de cubos igual al modelo.';

export const MATERIAL_ESPACIAL: Record<string, ItemFigura[]> = {
  S1: [
    {
      enunciado: IDENTICAS,
      estimulo: poligono(ESCALON),
      opciones: [
        poligono(ESCALON, 0, true),
        poligono(ESCALON),
        poligono(FLECHA),
        poligono(BANDERA),
      ],
    },
    {
      enunciado: IDENTICAS,
      estimulo: poligono(BANDERA),
      opciones: [
        poligono(BANDERA, 180),
        poligono(ESCALON),
        poligono(BANDERA, 0, true),
        poligono(BANDERA),
      ],
    },
  ],
  S2: [
    {
      enunciado: DESPLAZADA,
      estimulo: poligono(FLECHA),
      opciones: [
        poligono(FLECHA, 90),
        poligono(FLECHA, 0, true),
        poligono(ESCALON, 90),
        poligono(BANDERA, 45),
      ],
    },
    {
      enunciado: DESPLAZADA,
      estimulo: poligono(ESCALON),
      opciones: [
        poligono(ESCALON, 90, true),
        poligono(BANDERA, 180),
        poligono(ESCALON, 180),
        poligono(ESCALON, 0, true),
      ],
    },
  ],
  S1b: [
    {
      enunciado: LADRILLOS,
      estimulo: cubos([3, 1, 2]),
      opciones: [
        cubos([1, 3, 2]),
        cubos([3, 1, 2]),
        cubos([3, 2, 1]),
        cubos([2, 1, 3]),
        cubos([3, 1, 1]),
      ],
    },
    {
      enunciado: LADRILLOS,
      estimulo: cubos([1, 2, 3, 1]),
      opciones: [
        cubos([1, 2, 3]),
        cubos([1, 3, 2, 1]),
        cubos([1, 2, 3, 1]),
        cubos([2, 2, 3, 1]),
        cubos([1, 2, 2, 1]),
      ],
    },
  ],
};
