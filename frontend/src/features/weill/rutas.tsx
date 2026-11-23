import type { RouteObject } from 'react-router';
import { PaginaPendiente } from '../../components/PaginaPendiente';
import { InicioWeillPagina } from './InicioWeillPagina';

export const rutasWeill: RouteObject[] = [
  { path: 'weill', element: <InicioWeillPagina /> },
  // La aplicación de ítems llega con WEI-FE-03.
  { path: 'weill/intentos/:intentoId', element: <PaginaPendiente nombre="Aplicación Weill" /> },
];
