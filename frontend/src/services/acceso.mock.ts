import type { ClienteAcceso, CuentaResponse, Rol, SesionResponse } from '../features/acceso/tipos';
import { fallar } from './evaluacion.mock';

/**
 * Simulación de E13–E17 con cuentas ficticias (una por rol, contraseña CONTRASENA_MOCK).
 * Escenarios:
 *   Registrar con un rol distinto de SUJETO → 403 ROL_NO_AUTORIZADO (no hay quien lo autorice)
 *   Registrar un correo existente           → 409 CUENTA_EXISTENTE
 *   Contraseña de menos de 8 caracteres     → 400 SOLICITUD_INVALIDA
 *   Credenciales incorrectas                → 401 CREDENCIALES_INVALIDAS
 *   Recuperación de correo-caido@ejemplo.test → 503 CORREO_NO_DISPONIBLE
 *   Token de E17: RECUPERAR-<id de la cuenta> tras pedirlo con E16; solo sirve una vez.
 */

export const CONTRASENA_MOCK = 'Prueba2026!';
const LONGITUD_MINIMA = 8;

interface Cuenta extends CuentaResponse {
  contrasena: string;
}

/** Cuentas ficticias de arranque, una por rol. */
export const CORREOS_MOCK: Record<Rol, string> = {
  SUJETO: 'sujeto@ejemplo.test',
  PSICOLOGO: 'psicologo@ejemplo.test',
  COORDINADOR: 'coordinador@ejemplo.test',
  ACADEMICO: 'academico@ejemplo.test',
  DECANO: 'decano@ejemplo.test',
};

const PERMISOS: Record<Rol, string[]> = {
  SUJETO: ['PRACTICA_REALIZAR'],
  PSICOLOGO: ['SUJETO_CREAR', 'SUJETO_LEER', 'PERIODO_LEER', 'RECUPERAR_INTENTO'],
  COORDINADOR: [
    'SUJETO_CREAR',
    'SUJETO_LEER',
    'PERIODO_CREAR',
    'PERIODO_LEER',
    'RECUPERAR_INTENTO',
    'OPERACION_AUTORIZAR',
  ],
  ACADEMICO: ['SUJETO_LEER', 'PERIODO_LEER', 'RECUPERAR_INTENTO'],
  DECANO: ['SUJETO_LEER', 'PERIODO_LEER', 'RECUPERAR_INTENTO'],
};

const cuentasIniciales = (): Cuenta[] =>
  (Object.keys(CORREOS_MOCK) as Rol[]).map((rol, i) => ({
    id: i + 1,
    correo: CORREOS_MOCK[rol],
    rol,
    estado: 'ACTIVA',
    contrasena: CONTRASENA_MOCK,
  }));

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function crearClienteAccesoMock({ retardoMs = 500 }: { retardoMs?: number } = {}) {
  const cuentas = new Map(cuentasIniciales().map((c) => [c.correo, c]));
  const tokens = new Map<string, string>(); // token de recuperación → correo
  let siguienteId = cuentas.size + 1;

  const esperar = () => new Promise<void>((resolver) => setTimeout(resolver, retardoMs));
  const normalizar = (correo: string) => correo.trim().toLowerCase();
  const validarContrasena = (campo: string, valor: string, ruta: string) => {
    if (valor.length < LONGITUD_MINIMA)
      fallar(400, 'SOLICITUD_INVALIDA', 'La solicitud tiene datos inválidos.', ruta, [
        { campo, mensaje: `debe tener al menos ${LONGITUD_MINIMA} caracteres` },
      ]);
  };

  const cliente: ClienteAcceso = {
    async registrar(solicitud) {
      await esperar();
      const ruta = '/api/v1/auth/registro';
      const correo = normalizar(solicitud.correo);
      if (!CORREO_VALIDO.test(correo))
        fallar(400, 'SOLICITUD_INVALIDA', 'La solicitud tiene datos inválidos.', ruta, [
          { campo: 'correo', mensaje: 'no es un correo válido' },
        ]);
      validarContrasena('contrasena', solicitud.contrasena, ruta);
      if (solicitud.rol !== 'SUJETO')
        fallar(403, 'ROL_NO_AUTORIZADO', 'No tiene permiso para asignar ese rol.', ruta);
      if (cuentas.has(correo))
        fallar(409, 'CUENTA_EXISTENTE', 'Ya existe una cuenta con ese correo.', ruta);
      const cuenta: Cuenta = {
        id: siguienteId++,
        correo,
        rol: solicitud.rol,
        estado: 'ACTIVA',
        contrasena: solicitud.contrasena,
      };
      cuentas.set(correo, cuenta);
      return { id: cuenta.id, correo, rol: cuenta.rol, estado: cuenta.estado };
    },

    async iniciarSesion(solicitud) {
      await esperar();
      const cuenta = cuentas.get(normalizar(solicitud.correo));
      if (!cuenta || cuenta.contrasena !== solicitud.contrasena)
        fallar(
          401,
          'CREDENCIALES_INVALIDAS',
          'Correo o contraseña incorrectos.',
          '/api/v1/auth/sesion',
        );
      const sesion: SesionResponse = {
        token: `mock-${cuenta.id}-${Date.now()}`,
        expiraEn: new Date(Date.now() + 8 * 3600_000).toISOString(),
        rolActivo: cuenta.rol,
        permisos: PERMISOS[cuenta.rol],
      };
      return sesion;
    },

    async cerrarSesion() {
      await esperar();
    },

    async pedirRecuperacion({ correo }) {
      await esperar();
      const clave = normalizar(correo);
      if (!CORREO_VALIDO.test(clave))
        fallar(
          400,
          'SOLICITUD_INVALIDA',
          'La solicitud tiene datos inválidos.',
          '/api/v1/auth/recuperacion',
          [{ campo: 'correo', mensaje: 'no es un correo válido' }],
        );
      if (clave === 'correo-caido@ejemplo.test') fallarConexion503();
      // Responde igual exista o no la cuenta.
      const cuenta = cuentas.get(clave);
      if (cuenta) tokens.set(`RECUPERAR-${cuenta.id}`, clave);
    },

    async confirmarRecuperacion({ token, nuevaContrasena }) {
      await esperar();
      const ruta = '/api/v1/auth/recuperacion/confirmar';
      validarContrasena('nuevaContrasena', nuevaContrasena, ruta);
      const correo = tokens.get(token.trim());
      const cuenta = correo ? cuentas.get(correo) : undefined;
      if (!cuenta)
        fallar(400, 'TOKEN_INVALIDO', 'El enlace venció, ya se usó o no existe. Pida otro.', ruta);
      cuenta.contrasena = nuevaContrasena;
      tokens.delete(token.trim());
    },
  };
  return cliente;
}

function fallarConexion503(): never {
  fallar(
    503,
    'CORREO_NO_DISPONIBLE',
    'No se pudo enviar el correo. Intente pedirlo de nuevo.',
    '/api/v1/auth/recuperacion',
  );
}
