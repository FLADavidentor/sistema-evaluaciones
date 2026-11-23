/// <reference types="vite/client" />
import { servicioAcceso } from '../../services/acceso';
import { crearClienteAccesoMock } from '../../services/acceso.mock';
import { usaMocks } from '../evaluacion/cliente';
import type { ClienteAcceso } from './tipos';

/** Mock o API real según VITE_USAR_MOCKS, igual que el resto de módulos. */
export const clienteAcceso: ClienteAcceso = usaMocks ? crearClienteAccesoMock() : servicioAcceso;
