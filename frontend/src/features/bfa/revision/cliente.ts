import { usaMocksResultados } from '../../resultados/cliente';
import { revisionSimuladaDe } from '../../../services/revision.mock';
import { servicioRevision } from '../../../services/revision';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import type { BfaApi } from '../api/bfaApi';
import type { ClienteRevision } from './tipos';

/** Elige E10–E12: con VITE_USAR_MOCKS=false y la API real, el backend; si no, la simulación. */
export const clienteRevisionPara = (api: BfaApi): ClienteRevision =>
  usaMocksResultados && api instanceof BfaApiSimulada ? revisionSimuladaDe(api) : servicioRevision;
