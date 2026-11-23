import type { RouteObject } from 'react-router';
import { LoginPagina } from './LoginPagina';
import { RecuperarPagina } from './RecuperarPagina';
import { RegistroPagina } from './RegistroPagina';

// GEN-06-FE: login (E14), registro (E13) y recuperación (E16/E17); cerrar sesión (E15) está en la Plantilla.
export const rutasAcceso: RouteObject[] = [
  { path: 'acceso', element: <LoginPagina /> },
  { path: 'acceso/registro', element: <RegistroPagina /> },
  { path: 'acceso/recuperar', element: <RecuperarPagina /> },
];
