import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { establecerToken } from '../../services/http';
import { clienteAcceso } from './cliente';
import { guardarSesion, leerSesionGuardada, SesionContexto } from './sesion';
import type { ClienteAcceso, Sesion } from './tipos';

/** Mantiene la sesión (rol activo y token) y la expone con useSesion(). */
export function SesionProveedor({
  children,
  cliente = clienteAcceso,
}: {
  children: ReactNode;
  cliente?: ClienteAcceso;
}) {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const guardada = leerSesionGuardada();
    establecerToken(guardada?.token ?? null);
    return guardada;
  });

  const iniciar = useCallback(
    async (solicitud: { correo: string; contrasena: string }) => {
      const respuesta = await cliente.iniciarSesion(solicitud);
      const nueva: Sesion = { ...respuesta, correo: solicitud.correo.trim().toLowerCase() };
      establecerToken(nueva.token);
      guardarSesion(nueva);
      setSesion(nueva);
    },
    [cliente],
  );

  const cerrar = useCallback(async () => {
    // La sesión local se cierra aunque E15 falle: el token ya no se usa.
    try {
      await cliente.cerrarSesion();
    } finally {
      establecerToken(null);
      guardarSesion(null);
      setSesion(null);
    }
  }, [cliente]);

  const valor = useMemo(() => ({ sesion, iniciar, cerrar }), [sesion, iniciar, cerrar]);
  return <SesionContexto value={valor}>{children}</SesionContexto>;
}
