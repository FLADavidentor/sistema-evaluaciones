import type { RouteObject } from 'react-router';
import { RevisionPagina } from './RevisionPagina';

export const rutasRevision: RouteObject[] = [
  // BFA-FE-09: revisión de FV (E10), recálculo (E11) y publicación (E12).
  { path: 'evaluaciones/:evaluacionId/revision', element: <RevisionPagina /> },
];
