import type { RouteObject } from 'react-router';
import { GestionPagina } from './GestionPagina';
import { PanelPagina } from './PanelPagina';

// GEN-02-FE: panel del profesional (E22) y gestión de sujetos y períodos (E18–E21, E23).
export const rutasGestion: RouteObject[] = [
  { path: 'panel', element: <PanelPagina /> },
  { path: 'gestion', element: <GestionPagina /> },
];
