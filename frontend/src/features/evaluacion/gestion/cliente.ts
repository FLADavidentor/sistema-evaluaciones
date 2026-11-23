import { crearClienteGestionMock } from '../../../services/gestion.mock';
import { servicioGestion } from '../../../services/gestion';
import { usaMocks } from '../cliente';
import type { ClienteGestion } from './tipos';

/** Mock o API real según VITE_USAR_MOCKS. */
export const clienteGestion: ClienteGestion = usaMocks
  ? crearClienteGestionMock()
  : servicioGestion;
