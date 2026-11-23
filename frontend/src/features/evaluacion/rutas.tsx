import type { RouteObject } from 'react-router';
import { PaginaPendiente } from '../../components/PaginaPendiente';
import { rutasGestion } from './gestion/rutas';
import { InicioEvaluacionPagina } from './InicioEvaluacionPagina';

export const rutasEvaluacion: RouteObject[] = [
  ...rutasGestion,
  // GEN-02-FE: iniciar o retomar (?testId=<id>, por defecto BFA).
  { path: 'evaluaciones/inicio', element: <InicioEvaluacionPagina /> },
  // Destino de «Continuar»; la aplicación de subpruebas la implementa otra tarea.
  {
    path: 'evaluaciones/:evaluacionId',
    element: <PaginaPendiente nombre="Aplicación de la evaluación" />,
  },
];
