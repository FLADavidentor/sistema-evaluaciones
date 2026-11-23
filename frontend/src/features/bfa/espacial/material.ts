// Material de EJEMPLO de S1, S2 y S1b: figuras 3D de Ganis y Kievit 2015 (CC BY 4.0) en
// public/material/bfa-espacial. No son reactivos del BFA ni llevan clave (E6 nunca devuelve
// la respuesta correcta); el orden de las alternativas se baraja de forma determinista.

export interface ItemFigura {
  enunciado: string;
  /** Figura modelo (`recursoUrl` de la pregunta). */
  estimulo: string;
  /** Una figura por alternativa (`recursoUrl` de cada opción). */
  opciones: string[];
}

export const CREDITO_ESPACIAL = 'Figuras: Ganis y Kievit 2015 (CC BY 4.0)';
export const RUTA_ESPACIAL = '/material/bfa-espacial/';

const ENUNCIADO = 'Elige la figura que es el modelo girado, sin darle vuelta.';
const ITEMS_POR_SUBPRUEBA = 4;
const INICIO: Record<string, number> = { S1: 1, S2: 5, S1b: 9 };
// Alternativas usadas: S1 y S2 llevan 1 (misma figura girada) y 2, 4, 5 (espejadas).
const ARCHIVOS: Record<string, number[]> = {
  S1: [1, 2, 4, 5],
  S2: [1, 2, 4, 5],
  S1b: [1, 2, 3, 4, 5],
};

const dos = (n: number) => String(n).padStart(2, '0');

export function materialEspacial(codigo: string): ItemFigura[] | undefined {
  const archivos = ARCHIVOS[codigo];
  if (!archivos) return undefined;
  return Array.from({ length: ITEMS_POR_SUBPRUEBA }, (_, i) => {
    const kk = dos(INICIO[codigo] + i);
    return {
      enunciado: ENUNCIADO,
      estimulo: `${RUTA_ESPACIAL}${kk}-modelo.jpg`,
      opciones: archivos.map(
        (_, j) =>
          `${RUTA_ESPACIAL}${kk}-alternativa-${archivos[(j + i + 1) % archivos.length]}.jpg`,
      ),
    };
  });
}
