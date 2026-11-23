import { describe, expect, it } from 'vitest';
import { crearCatalogoMock } from '../../../services/catalogo.mock';
import { ordenarSubpruebas, rutaDeInicio } from './flujoCatalogo';

describe('flujo del catálogo (GEN-01-FE)', () => {
  it('ordena las subpruebas por su orden oficial', () => {
    const orden = ordenarSubpruebas([
      { codigo: 'B', orden: 2 },
      { codigo: 'C' },
      { codigo: 'A', orden: 1 },
    ]).map((s) => s.codigo);
    expect(orden).toEqual(['A', 'B', 'C']);
  });

  it('el detalle simulado de BFA queda con sus 13 subpruebas en orden', async () => {
    const test = await crearCatalogoMock({ retardoMs: 0 }).obtenerTest(1);
    const ordenes = ordenarSubpruebas(test.subpruebas).map((s) => s.orden ?? 0);
    expect(ordenes).toHaveLength(13);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
  });

  it('solo BFA tiene ruta de inicio por ahora', () => {
    expect(rutaDeInicio('BFA')).toBe('/bfa');
    expect(rutaDeInicio('WEILL')).toBe('/weill');
    expect(rutaDeInicio('OTRO')).toBeNull();
    expect(rutaDeInicio(undefined)).toBeNull();
  });
});
