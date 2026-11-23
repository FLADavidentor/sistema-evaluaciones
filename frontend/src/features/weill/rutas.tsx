import type { RouteObject } from 'react-router';
import { AplicacionWeillPagina } from './AplicacionWeillPagina';
import { ConstanciaWeillPagina } from './ConstanciaWeillPagina';
import { InicioWeillPagina } from './InicioWeillPagina';
import { ResultadoWeillPagina } from './ResultadoWeillPagina';

export const rutasWeill: RouteObject[] = [
  { path: 'weill', element: <InicioWeillPagina /> },
  { path: 'weill/intentos/:intentoId', element: <AplicacionWeillPagina /> },
  { path: 'weill/intentos/:intentoId/constancia', element: <ConstanciaWeillPagina /> },
  // Vista del psicólogo.
  { path: 'weill/intentos/:intentoId/resultado', element: <ResultadoWeillPagina /> },
];
