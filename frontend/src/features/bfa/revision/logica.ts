import type { BorradorRevision, DecisionPalabra, PalabraRevision } from './tipos';

export interface ConteoDecisiones {
  aceptadas: number;
  rechazadas: number;
  pendientes: number;
}

/** Aceptar = VALIDA y rechazar = INVALIDA (E10). */
export function contarDecisiones(palabras: PalabraRevision[]): ConteoDecisiones {
  const cuenta = (d: DecisionPalabra) => palabras.filter((p) => p.decision === d).length;
  return {
    aceptadas: cuenta('VALIDA'),
    rechazadas: cuenta('INVALIDA'),
    pendientes: cuenta('PENDIENTE'),
  };
}

export const motivoValido = (motivo: string) => motivo.trim() !== '';

/** La revisión candidata ya es la vigente: para cambiarla hay que recalcular (E11). */
export const yaPublicada = (b: BorradorRevision) =>
  b.revision !== null && b.revision === b.revisionVigente;

/** Publicable si hay una revisión candidata sin publicar y no quedan palabras pendientes. */
export const puedePublicar = (b: BorradorRevision) =>
  b.calificacionId !== null && !yaPublicada(b) && contarDecisiones(b.palabras).pendientes === 0;

/** Roles que ven la revisión publicada (DOC-04 §3.6); el valor enviado sigue el ejemplo de E12. */
export const AUDIENCIAS = [
  { valor: 'SUJETO', etiqueta: 'Sujeto' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'COORDINADOR', etiqueta: 'Coordinador' },
  { valor: 'PSICOLOGO', etiqueta: 'Psicólogo' },
  { valor: 'DECANO', etiqueta: 'Decano' },
] as const;
