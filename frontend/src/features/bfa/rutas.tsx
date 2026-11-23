import type { RouteObject } from 'react-router';
import { BfaAccesoPagina } from './BfaAccesoPagina';
import { BfaEvaluacionPagina } from './BfaEvaluacionPagina';

export const rutasBfa: RouteObject[] = [
  { path: 'bfa', element: <BfaAccesoPagina /> },
  { path: 'bfa/evaluaciones/:evaluacionId', element: <BfaEvaluacionPagina /> },
];
