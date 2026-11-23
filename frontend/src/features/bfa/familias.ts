import type { ReactNode } from 'react';
import type { OptionsLayout, PromptVariant } from '../../components/TestScreen';
import { renderEnunciadoRazonamiento, renderOpcionRazonamiento } from './razonamiento/render';

/**
 * Cómo se presenta cada subprueba dentro del flujo general. Las familias del BFA se enchufan aquí
 * (UI-04 define las variantes visuales); el flujo no conoce el contenido de los ítems.
 */
export interface PresentacionSubprueba {
  promptVariant: PromptVariant;
  optionsLayout: OptionsLayout;
  numeric?: boolean;
  /** Texto de instrucciones de la subprueba. */
  instrucciones: string;
  /** Texto de la práctica, si la subprueba tiene. */
  practica?: string;
  /**
   * Permite volver a preguntas anteriores mientras la subprueba está activa (Documento BFA §5.2).
   * Pendiente de confirmar qué subpruebas lo restringen y dónde se configura (consulta C-1 de GEN-03).
   */
  volverAtras: boolean;
  /** Dibuja el enunciado de la familia (series, analogías, operaciones...). Sin él, se muestra el texto. */
  renderEnunciado?: (enunciado: string) => ReactNode;
  /** Dibuja el texto de cada alternativa. Sin él, se muestra el texto. */
  renderOpcion?: (texto: string) => ReactNode;
}

// El texto real lo define el material oficial de la UAM; no se inventan consignas.
// Podría venir de E24 (instrucciones y ejemplos de práctica, Documento general §5.2.4), pero ninguna
// tarea de GEN-03 lo implementa todavía (consulta C-6).
const INSTRUCCIONES_PENDIENTES =
  'Lee con atención. Las instrucciones oficiales de esta subprueba se cargarán desde el material aprobado.';
const PRACTICA_PENDIENTE = 'Aquí se resolverá el ejemplo de práctica. No consume tiempo oficial.';

const base = (parcial: Partial<PresentacionSubprueba>): PresentacionSubprueba => ({
  promptVariant: 'title',
  optionsLayout: 'list',
  instrucciones: INSTRUCCIONES_PENDIENTES,
  practica: PRACTICA_PENDIENTE,
  volverAtras: true,
  ...parcial,
});

const figuras = { promptVariant: 'hidden', optionsLayout: 'figures' } as const;
const operacionBinaria = {
  promptVariant: 'display',
  optionsLayout: 'binary',
  numeric: true,
} as const;

export const presentacionPorSubprueba: Record<string, PresentacionSubprueba> = {
  VOC1: base({ promptVariant: 'display' }),
  VOC2: base({ promptVariant: 'statement', optionsLayout: 'compact' }),
  S1: base(figuras),
  S2: base(figuras),
  S1b: base(figuras),
  R1: base({
    promptVariant: 'display',
    optionsLayout: 'compact',
    renderEnunciado: renderEnunciadoRazonamiento,
    renderOpcion: renderOpcionRazonamiento,
  }),
  R2: base({
    promptVariant: 'statement',
    optionsLayout: 'compact',
    renderEnunciado: renderEnunciadoRazonamiento,
    renderOpcion: renderOpcionRazonamiento,
  }),
  CV: base({ promptVariant: 'statement' }),
  'N1-A': base(operacionBinaria),
  'N1-B': base(operacionBinaria),
  'N2-A': base({ promptVariant: 'display', optionsLayout: 'compact', numeric: true }),
  'N2-B': base({ promptVariant: 'statement', numeric: true }),
  FV: base({}),
};

export function presentacionDe(codigo: string): PresentacionSubprueba {
  return presentacionPorSubprueba[codigo] ?? base({});
}

/** Comprensión Verbal admite una pausa de 5 a 10 minutos antes de empezar (RF-CV-04). */
export const PAUSA_ANTES_DE = 'CV';
