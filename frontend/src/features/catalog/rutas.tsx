/**
 * Se eliminaron las dependencia de PaginaPendiente, ademas
 * importamos CatalogoPage, con esto conservamos rutasCatalogo como exportacion
 * para respetar la arquitectura modular. Para asi poder mantner la ruta
 * como indic, tal como estaba definida originalmente.
 */
import type { RouteObject } from 'react-router';

import { CatalogoPage } from './components/CatalogoPage';

export const rutasCatalogo: RouteObject[] = [
  {
    index: true,
    element: <CatalogoPage />,
  },
];
