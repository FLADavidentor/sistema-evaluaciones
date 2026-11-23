import { servicioWeill } from '../../services/weill';
import { crearClienteWeillMock } from '../../services/weill.mock';
import type { ClienteWeill } from './tipos';

/** Mock por defecto; con VITE_USAR_MOCKS=false se usa el adaptador real (aún sin contrato). */
export const clienteWeill: ClienteWeill =
  import.meta.env.VITE_USAR_MOCKS !== 'false' ? crearClienteWeillMock() : servicioWeill;
