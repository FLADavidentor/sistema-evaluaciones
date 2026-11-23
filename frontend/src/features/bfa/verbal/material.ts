// Material FICTICIO de VOC1, VOC2 y CV para desarrollar y probar la familia Verbal con la API
// simulada. Palabras y sentencias inventadas: no son reactivos del BFA ni llevan clave.

export const MATERIAL_VERBAL: Record<string, [string, string[]][]> = {
  // VOC1: palabra en mayúsculas y cinco alternativas (sinónimos).
  VOC1: [
    ['RÁPIDO', ['lento', 'veloz', 'pesado', 'quieto', 'tardío']],
    ['ALEGRE', ['contento', 'cansado', 'serio', 'callado', 'distante']],
    ['ANTIGUO', ['moderno', 'nuevo', 'viejo', 'pequeño', 'limpio']],
    ['ENORME', ['diminuto', 'gigante', 'ligero', 'oscuro', 'breve']],
  ],
  // VOC2: bloque de cinco palabras; se marca la que no pertenece al grupo.
  VOC2: [
    ['Marca la palabra que no pertenece al grupo.', ['manzana', 'pera', 'uva', 'silla', 'mango']],
    ['Marca la palabra que no pertenece al grupo.', ['rojo', 'azul', 'verde', 'lunes', 'amarillo']],
    ['Marca la palabra que no pertenece al grupo.', ['perro', 'gato', 'mesa', 'caballo', 'conejo']],
  ],
  // CV: sentencia inventada y tres interpretaciones.
  CV: [
    [
      'Quien riega su huerto cada mañana no espera la lluvia para cosechar.',
      [
        'El trabajo constante da frutos sin depender de la suerte.',
        'Conviene regar las plantas temprano para que crezcan.',
        'La lluvia es más útil que el riego para el huerto.',
      ],
    ],
    [
      'El puente que se cuida en verano no se pierde en invierno.',
      [
        'Los puentes se dañan más en invierno que en verano.',
        'Prevenir a tiempo evita problemas cuando llegan las dificultades.',
        'Es mejor construir puentes durante el verano.',
      ],
    ],
    [
      'Una vela encendida no pierde luz por encender otra.',
      [
        'Las velas duran más si se encienden juntas.',
        'Compartir lo que uno sabe no le quita nada.',
        'Una sola vela basta para iluminar una casa.',
      ],
    ],
  ],
};
