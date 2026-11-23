/// <reference types="vite/client" />
import { servicioAdministracion } from '../../services/administracion';
import { crearAdministracionMock } from '../../services/administracion.mock';
import type { ClienteAdministracion } from './tipos';

/** Elige mock o API real; con el backend integrado, VITE_USAR_MOCKS=false en frontend/.env.local. */
export const clienteAdministracion: ClienteAdministracion =
  import.meta.env.VITE_USAR_MOCKS !== 'false' ? crearAdministracionMock() : servicioAdministracion;
