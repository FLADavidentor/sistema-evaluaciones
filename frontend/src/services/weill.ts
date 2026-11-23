import type { ClienteWeill } from '../features/weill/tipos';

/** Las rutas de Weill no están definidas (DOC-09); cada llamada falla hasta tener contrato. */
const pendiente = (): never => {
  throw new Error('Weill: pendiente de contrato DOC-09');
};

export const servicioWeill: ClienteWeill = {
  obtenerIntentoEnCurso: async () => pendiente(),
  iniciarIntento: async () => pendiente(),
  obtenerIntento: async () => pendiente(),
  guardarRespuesta: async () => pendiente(),
  finalizarIntento: async () => pendiente(),
  obtenerConstancia: async () => pendiente(),
  obtenerResultado: async () => pendiente(),
};
