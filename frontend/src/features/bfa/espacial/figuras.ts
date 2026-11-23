// Figuras sintéticas generadas en código para el material FICTICIO de la familia Espacial.
// Son formas geométricas simples, no reactivos del BFA. Se entregan como `recursoUrl` (data URL).

export type Punto = [number, number];

const TINTA = '#1f2937';

/** Envuelve el dibujo en un SVG 120×80 (la proporción de `Figura`) y lo vuelve data URL. */
export function aDataUrl(cuerpo: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" fill="#fff"/>${cuerpo}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Polígono girado (grados) y opcionalmente reflejado sobre el centro de la figura. */
export function poligono(puntos: Punto[], giro = 0, espejo = false): string {
  const p = puntos.map(([x, y]) => `${x},${y}`).join(' ');
  const t = `translate(60 40) rotate(${giro}) scale(${espejo ? -1 : 1} 1) translate(-60 -40)`;
  return aDataUrl(
    `<polygon points="${p}" transform="${t}" fill="#e5e7eb" stroke="${TINTA}" stroke-width="2" stroke-linejoin="round"/>`,
  );
}

/** Pila de cubos en perspectiva oblicua: `alturas[i]` es el número de cubos de la columna i. */
export function cubos(alturas: number[]): string {
  const lado = 12;
  const fondo = 6;
  const x0 = 60 - (alturas.length * lado) / 2 - fondo / 2;
  const caras: string[] = [];
  alturas.forEach((altura, col) => {
    for (let nivel = 0; nivel < altura; nivel++) {
      const x = x0 + col * lado;
      const y = 70 - (nivel + 1) * lado;
      const cara = (puntos: Punto[], relleno: string) =>
        caras.push(
          `<polygon points="${puntos.map(([a, b]) => `${a},${b}`).join(' ')}" fill="${relleno}" stroke="${TINTA}" stroke-width="1.5" stroke-linejoin="round"/>`,
        );
      cara(
        [
          [x, y],
          [x + lado, y],
          [x + lado, y + lado],
          [x, y + lado],
        ],
        '#f3f4f6',
      );
      cara(
        [
          [x, y],
          [x + fondo, y - fondo],
          [x + lado + fondo, y - fondo],
          [x + lado, y],
        ],
        '#ffffff',
      );
      cara(
        [
          [x + lado, y],
          [x + lado + fondo, y - fondo],
          [x + lado + fondo, y + lado - fondo],
          [x + lado, y + lado],
        ],
        '#d1d5db',
      );
    }
  });
  return aDataUrl(caras.join(''));
}
