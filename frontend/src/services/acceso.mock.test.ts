import { describe, expect, it } from 'vitest';
import { ApiError } from './http';
import { CONTRASENA_MOCK, CORREOS_MOCK, crearClienteAccesoMock } from './acceso.mock';
import { ROLES } from '../features/acceso/tipos';

const cliente = () => crearClienteAccesoMock({ retardoMs: 0 });
const codigoDe = async (promesa: Promise<unknown>) =>
  promesa.then(
    () => null,
    (e: unknown) => (e instanceof ApiError ? e.error?.codigo : 'otro'),
  );

describe('mock de acceso (E13–E17)', () => {
  it('E14 abre sesión con el rol de cada cuenta de ejemplo', async () => {
    for (const rol of ROLES) {
      const sesion = await cliente().iniciarSesion({
        correo: CORREOS_MOCK[rol],
        contrasena: CONTRASENA_MOCK,
      });
      expect(sesion.rolActivo).toBe(rol);
      expect(sesion.token).toBeTruthy();
    }
  });

  it('E14 rechaza credenciales incorrectas con CREDENCIALES_INVALIDAS', async () => {
    const c = cliente();
    expect(await codigoDe(c.iniciarSesion({ correo: CORREOS_MOCK.SUJETO, contrasena: 'x' }))).toBe(
      'CREDENCIALES_INVALIDAS',
    );
    expect(await codigoDe(c.iniciarSesion({ correo: 'nadie@ejemplo.test', contrasena: 'x' }))).toBe(
      'CREDENCIALES_INVALIDAS',
    );
  });

  it('E13 crea una cuenta SUJETO y luego permite entrar', async () => {
    const c = cliente();
    const base = {
      nombres: 'Ana',
      apellidos: 'Ruiz',
      contrasena: 'Segura2026',
      rol: 'SUJETO',
    } as const;
    const cuenta = await c.registrar({ ...base, correo: 'Nueva@ejemplo.test' });
    expect(cuenta).toMatchObject({ correo: 'nueva@ejemplo.test', rol: 'SUJETO', estado: 'ACTIVA' });
    expect(cuenta).not.toHaveProperty('contrasena');
    await expect(
      c.iniciarSesion({ correo: 'nueva@ejemplo.test', contrasena: 'Segura2026' }),
    ).resolves.toMatchObject({ rolActivo: 'SUJETO' });
    expect(await codigoDe(c.registrar({ ...base, correo: 'nueva@ejemplo.test' }))).toBe(
      'CUENTA_EXISTENTE',
    );
  });

  it('E13 rechaza roles no autorizados y contraseñas cortas', async () => {
    const c = cliente();
    const base = { nombres: 'A', apellidos: 'B', correo: 'a@ejemplo.test' };
    expect(await codigoDe(c.registrar({ ...base, contrasena: 'Segura2026', rol: 'DECANO' }))).toBe(
      'ROL_NO_AUTORIZADO',
    );
    expect(await codigoDe(c.registrar({ ...base, contrasena: 'corta', rol: 'SUJETO' }))).toBe(
      'SOLICITUD_INVALIDA',
    );
  });

  it('E16/E17 cambian la contraseña con un token de un solo uso', async () => {
    const c = cliente();
    await c.pedirRecuperacion({ correo: CORREOS_MOCK.SUJETO });
    await c.pedirRecuperacion({ correo: 'desconocido@ejemplo.test' }); // responde igual
    await c.confirmarRecuperacion({ token: 'RECUPERAR-1', nuevaContrasena: 'Nueva2026!' });
    await expect(
      c.iniciarSesion({ correo: CORREOS_MOCK.SUJETO, contrasena: 'Nueva2026!' }),
    ).resolves.toBeTruthy();
    expect(
      await codigoDe(
        c.confirmarRecuperacion({ token: 'RECUPERAR-1', nuevaContrasena: 'Otra2026!' }),
      ),
    ).toBe('TOKEN_INVALIDO');
  });

  it('E16 informa CORREO_NO_DISPONIBLE', async () => {
    expect(
      await codigoDe(cliente().pedirRecuperacion({ correo: 'correo-caido@ejemplo.test' })),
    ).toBe('CORREO_NO_DISPONIBLE');
  });
});
