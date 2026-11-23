import type { RouteObject } from 'react-router';
import { AplicacionWeillPagina } from './AplicacionWeillPagina';
import { InicioWeillPagina } from './InicioWeillPagina';

export const rutasWeill: RouteObject[] = [
  { path: 'weill', element: <InicioWeillPagina /> },
  { path: 'weill/intentos/:intentoId', element: <AplicacionWeillPagina /> },
];
