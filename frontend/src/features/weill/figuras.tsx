import { useId } from 'react';

/**
 * Gráficos SINTÉTICOS generados en código (rayados simples). No reproducen ítems reales
 * del instrumento ni codifican una clave de respuesta.
 */
const VARIANTES = [0, 45, 90, 135].flatMap((angulo) => [6, 11].map((paso) => ({ angulo, paso })));

const variante = (indice: number) => VARIANTES[indice % VARIANTES.length];

function Rayado({ id, indice }: { id: string; indice: number }) {
  const { angulo, paso } = variante(indice);
  return (
    <pattern
      id={id}
      width={paso}
      height={paso}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${angulo})`}
    >
      <line x1="0" y1="0" x2="0" y2={paso} stroke="currentColor" strokeWidth="2.5" />
    </pattern>
  );
}

/** Figura del ítem con un hueco cuya posición cambia según el orden. */
export function FiguraWeill({ orden }: { orden: number }) {
  const id = useId();
  const x = 30 + ((orden * 37) % 160);
  const y = 25 + ((orden * 23) % 60);
  return (
    <svg
      className="weill-figura"
      viewBox="0 0 240 150"
      role="img"
      aria-label={`Figura del ítem ${orden} con un espacio vacío`}
    >
      <defs>
        <Rayado id={id} indice={orden} />
      </defs>
      <rect x="1" y="1" width="238" height="148" fill={`url(#${id})`} stroke="currentColor" />
      <rect
        x={x}
        y={y}
        width="50"
        height="50"
        fill="var(--test-paper)"
        stroke="currentColor"
        strokeDasharray="5 4"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Pieza candidata (1–8) del ítem. */
export function PiezaWeill({ orden, pieza }: { orden: number; pieza: number }) {
  const id = useId();
  return (
    <svg className="weill-pieza" viewBox="0 0 50 50" aria-hidden="true">
      <defs>
        <Rayado id={id} indice={orden + pieza * 3} />
      </defs>
      <rect x="1" y="1" width="48" height="48" fill={`url(#${id})`} stroke="currentColor" />
    </svg>
  );
}
