import { describe, expect, it } from 'vitest';
import {
  contarGuardados,
  desdeServidor,
  itemLocal,
  primerPendiente,
  resolver,
  solicitar,
} from './respuestas';

describe('estado local de respuestas Weill', () => {
  it('marca guardado solo cuando la API confirma', () => {
    const enviando = solicitar({}, 3, 5);
    expect(itemLocal(enviando, 3)).toEqual({ pieza: 5, estado: 'guardando' });
    expect(contarGuardados(enviando)).toBe(0);
    const listo = resolver(enviando, 3, 5, true);
    expect(itemLocal(listo, 3)).toEqual({ pieza: 5, estado: 'guardado' });
    expect(contarGuardados(listo)).toBe(1);
  });

  it('otra pieza reemplaza e ignora la confirmación anterior', () => {
    let items = solicitar({}, 1, 2);
    items = solicitar(items, 1, 6);
    items = resolver(items, 1, 2, true);
    expect(itemLocal(items, 1)).toEqual({ pieza: 6, estado: 'guardando' });
    expect(itemLocal(resolver(items, 1, 6, true), 1).estado).toBe('guardado');
  });

  it('quitar deja el ítem pendiente', () => {
    const items = resolver(solicitar(desdeServidor({ 4: 1 }), 4, null), 4, null, true);
    expect(itemLocal(items, 4)).toEqual({ pieza: null, estado: 'pendiente' });
    expect(contarGuardados(items)).toBe(0);
  });

  it('un fallo deja el ítem en error para reintentar', () => {
    expect(itemLocal(resolver(solicitar({}, 2, 8), 2, 8, false), 2)).toEqual({
      pieza: 8,
      estado: 'error',
    });
  });

  it('al retomar se ubica en el primer ítem sin respuesta', () => {
    expect(primerPendiente(desdeServidor({ 1: 1, 2: 3, 4: 2 }))).toBe(3);
    expect(primerPendiente({})).toBe(1);
  });
});
