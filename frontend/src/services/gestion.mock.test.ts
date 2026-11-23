import { describe, expect, it } from 'vitest';
import { crearClienteGestionMock } from './gestion.mock';
import { ApiError } from './http';

const cliente = () => crearClienteGestionMock({ retardoMs: 0 });
const codigoDe = (promesa: Promise<unknown>) =>
  promesa.then(
    () => null,
    (e: unknown) => (e instanceof ApiError ? e.error?.codigo : 'otro'),
  );

describe('mock de gestión (E18–E23)', () => {
  it('E23 devuelve 0 o 1 sujeto', async () => {
    const c = cliente();
    expect(await c.buscarSujeto('2026-0153')).toHaveLength(1);
    expect(await c.buscarSujeto('9999-0000')).toEqual([]);
  });

  it('E18 registra y luego E23 lo encuentra; el duplicado da SUJETO_DUPLICADO', async () => {
    const c = cliente();
    const nuevo = { identificadorInstitucional: '2027-0001', nombres: 'Eva', apellidos: 'Mora' };
    const creado = await c.registrarSujeto(nuevo);
    expect(creado.id).toBeGreaterThan(0);
    expect(await c.buscarSujeto('2027-0001')).toEqual([creado]);
    expect(await codigoDe(c.registrarSujeto(nuevo))).toBe('SUJETO_DUPLICADO');
  });

  it('E20/E21 crean y listan períodos; valida duplicado e inicio posterior al fin', async () => {
    const c = cliente();
    const antes = (await c.listarPeriodos()).length;
    const p = { codigo: '2027-2', denominacion: 'Segundo semestre 2027', inicio: '2027-08-01', fin: '2027-12-15' };
    await c.crearPeriodo(p);
    expect(await c.listarPeriodos()).toHaveLength(antes + 1);
    expect(await codigoDe(c.crearPeriodo(p))).toBe('PERIODO_DUPLICADO');
    expect(
      await codigoDe(c.crearPeriodo({ ...p, codigo: 'X', inicio: '2028-01-01', fin: '2027-01-01' })),
    ).toBe('PERIODO_INVALIDO');
  });

  it('E22 filtra por estado y por sujeto', async () => {
    const c = cliente();
    expect(await c.listarEvaluaciones()).toHaveLength(2);
    expect((await c.listarEvaluaciones({ estado: 'EN_CURSO' })).map((e) => e.id)).toEqual([15]);
    expect((await c.listarEvaluaciones({ sujetoId: 26 })).map((e) => e.id)).toEqual([16]);
    expect(await c.listarEvaluaciones({ sujetoId: 1 })).toEqual([]);
  });
});
