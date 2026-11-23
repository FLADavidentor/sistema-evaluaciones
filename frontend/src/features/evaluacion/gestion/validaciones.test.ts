import { describe, expect, it } from 'vitest';
import { validarPeriodo, validarSujeto } from './validaciones';

describe('validaciones de gestión', () => {
  it('sujeto: exige identificador, nombres y apellidos; la fecha es opcional', () => {
    expect(validarSujeto({ identificadorInstitucional: ' ', nombres: '', apellidos: 'Ruiz' })).toEqual({
      identificadorInstitucional: 'Es obligatorio.',
      nombres: 'Es obligatorio.',
    });
    expect(
      validarSujeto({ identificadorInstitucional: '2026-0153', nombres: 'Ana', apellidos: 'Ruiz' }),
    ).toEqual({});
  });

  it('período: exige todo y que el inicio no sea posterior al fin', () => {
    const base = { codigo: '2027-2', denominacion: 'Segundo semestre 2027' };
    expect(validarPeriodo({ ...base, inicio: '', fin: '' })).toEqual({
      inicio: 'Es obligatorio.',
      fin: 'Es obligatorio.',
    });
    expect(validarPeriodo({ ...base, inicio: '2027-08-01', fin: '2027-07-01' }).fin).toMatch(
      /anterior/,
    );
    expect(validarPeriodo({ ...base, inicio: '2027-08-01', fin: '2027-12-15' })).toEqual({});
  });
});
