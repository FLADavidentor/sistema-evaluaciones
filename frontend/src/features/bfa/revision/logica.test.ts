import { describe, expect, it } from 'vitest';
import { contarDecisiones, motivoValido, puedePublicar, yaPublicada } from './logica';
import type { BorradorRevision, DecisionPalabra } from './tipos';

const borrador = (
  decisiones: DecisionPalabra[],
  extra: Partial<BorradorRevision> = {},
): BorradorRevision => ({
  calificacionId: 901,
  revision: 1,
  revisionVigente: null,
  palabras: decisiones.map((decision, i) => ({
    respuestaId: i + 1,
    ordenEntrada: i + 1,
    texto: `p${i}`,
    decision,
    motivo: null,
  })),
  ...extra,
});

describe('lógica de la revisión de FV', () => {
  it('cuenta aceptadas, rechazadas y pendientes', () => {
    expect(
      contarDecisiones(borrador(['VALIDA', 'VALIDA', 'INVALIDA', 'PENDIENTE']).palabras),
    ).toEqual({
      aceptadas: 2,
      rechazadas: 1,
      pendientes: 1,
    });
  });

  it('el motivo no puede ser solo espacios', () => {
    expect(motivoValido('  ')).toBe(false);
    expect(motivoValido(' ok ')).toBe(true);
  });

  it('solo se publica sin pendientes, con revisión candidata y sin estar ya vigente', () => {
    expect(puedePublicar(borrador(['VALIDA', 'INVALIDA']))).toBe(true);
    expect(puedePublicar(borrador(['VALIDA', 'PENDIENTE']))).toBe(false);
    expect(puedePublicar(borrador(['VALIDA'], { calificacionId: null, revision: null }))).toBe(
      false,
    );
    expect(puedePublicar(borrador(['VALIDA'], { revisionVigente: 1 }))).toBe(false);
    expect(yaPublicada(borrador([], { revisionVigente: 1 }))).toBe(true);
    expect(yaPublicada(borrador([], { revision: 2, revisionVigente: 1 }))).toBe(false);
  });
});
