import { contarRespondidos, esOrdenValido } from '../features/weill/items';
import {
  TOTAL_ITEMS,
  TOTAL_LAMINAS,
  TOTAL_PIEZAS,
  type ClienteWeill,
  type ConstanciaWeill,
  type IntentoWeill,
  type ItemWeill,
  type ResultadoWeill,
} from '../features/weill/tipos';
import { fallar } from './evaluacion.mock';

/**
 * Simulación de Weill mientras DOC-09 no define rutas. El estado se guarda en
 * localStorage para poder retomar el intento EN_CURSO tras recargar.
 */

/** Subconjunto de Storage; en pruebas se pasa uno en memoria. */
export interface AlmacenWeill {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

export interface OpcionesMockWeill {
  retardoMs?: number;
  almacen?: AlmacenWeill | null;
  /** Ítems cuyo guardado falla (para probar «Reintentar»). */
  fallaGuardado?: (orden: number) => boolean;
}

interface EstadoMock {
  siguienteId: number;
  intentos: IntentoWeill[];
}

const CLAVE = 'weill.mock.v1';

function almacenPorDefecto(): AlmacenWeill | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Material MaRs-IB (public/material/weill). El archivo 1 es el correcto, pero el cliente solo ve posiciones barajadas por ítem. */
export function materialItem(orden: number): ItemWeill {
  const piezas = Array.from({ length: TOTAL_PIEZAS }, (_, i) => {
    const archivo = ((i + orden * 3) % TOTAL_PIEZAS) + 1;
    return { pieza: i + 1, url: `/material/weill/${dos(orden)}-pieza-${archivo}.jpg` };
  });
  return { orden, figuraUrl: `/material/weill/${dos(orden)}-figura.jpg`, piezas };
}

const copiar = <T>(valor: T): T => structuredClone(valor);

export function crearClienteWeillMock({
  retardoMs = 400,
  almacen = almacenPorDefecto(),
  fallaGuardado = () => false,
}: OpcionesMockWeill = {}): ClienteWeill {
  let memoria: EstadoMock = { siguienteId: 1, intentos: [] };

  const leer = (): EstadoMock => {
    try {
      const texto = almacen?.getItem(CLAVE);
      if (texto) memoria = JSON.parse(texto) as EstadoMock;
    } catch {
      // Sin almacenamiento se sigue en memoria.
    }
    return memoria;
  };

  const escribir = (estado: EstadoMock) => {
    memoria = estado;
    try {
      almacen?.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Ídem.
    }
  };

  const esperar = () => new Promise<void>((resolver) => setTimeout(resolver, retardoMs));

  const buscar = (estado: EstadoMock, intentoId: number) => {
    const intento = estado.intentos.find((i) => i.id === intentoId);
    if (!intento)
      fallar(404, 'INTENTO_NO_ENCONTRADO', `El intento ${intentoId} no existe.`, 'weill');
    return intento;
  };

  const constancia = (intento: IntentoWeill): ConstanciaWeill => {
    const respondidos = contarRespondidos(intento.respuestas);
    return {
      intentoId: intento.id,
      fechaFin: intento.fechaFin ?? '',
      respondidos,
      omitidos: TOTAL_ITEMS - respondidos,
    };
  };

  return {
    async obtenerIntentoEnCurso() {
      await esperar();
      const intento = leer().intentos.find((i) => i.estado === 'EN_CURSO');
      return intento ? copiar(intento) : null;
    },

    async iniciarIntento() {
      await esperar();
      const estado = leer();
      if (estado.intentos.some((i) => i.estado === 'EN_CURSO'))
        fallar(409, 'INTENTO_EN_CURSO', 'Ya hay un intento en curso; retómelo.', 'weill');
      const intento: IntentoWeill = {
        id: estado.siguienteId,
        forma: 'A',
        estado: 'EN_CURSO',
        fechaInicio: new Date().toISOString(),
        fechaFin: null,
        finLimite: null,
        permitirRetroceso: true,
        respuestas: {},
      };
      escribir({ siguienteId: estado.siguienteId + 1, intentos: [...estado.intentos, intento] });
      return copiar(intento);
    },

    async obtenerIntento(intentoId) {
      await esperar();
      return copiar(buscar(leer(), intentoId));
    },

    async obtenerItem(intentoId, orden) {
      await esperar();
      buscar(leer(), intentoId);
      if (!esOrdenValido(orden)) fallar(400, 'ITEM_INVALIDO', `Ítem ${orden} inválido.`, 'weill');
      return materialItem(orden);
    },

    async guardarRespuesta(intentoId, orden, pieza) {
      await esperar();
      const estado = leer();
      const intento = buscar(estado, intentoId);
      if (intento.estado !== 'EN_CURSO')
        fallar(409, 'INTENTO_FINALIZADO', 'El intento ya no admite respuestas.', 'weill');
      if (!esOrdenValido(orden)) fallar(400, 'ITEM_INVALIDO', `Ítem ${orden} inválido.`, 'weill');
      if (pieza !== null && !(Number.isInteger(pieza) && pieza >= 1 && pieza <= TOTAL_PIEZAS))
        fallar(400, 'PIEZA_INVALIDA', `Pieza ${pieza} inválida.`, 'weill');
      if (fallaGuardado(orden)) throw new TypeError('Failed to fetch');
      if (pieza === null) delete intento.respuestas[orden];
      else intento.respuestas[orden] = pieza;
      escribir(estado);
      return { intentoId, orden, pieza, guardadaEn: new Date().toISOString() };
    },

    async finalizarIntento(intentoId) {
      await esperar();
      const estado = leer();
      const intento = buscar(estado, intentoId);
      if (intento.estado !== 'EN_CURSO')
        fallar(409, 'INTENTO_FINALIZADO', 'El intento ya fue finalizado.', 'weill');
      intento.estado = 'FINALIZADO';
      intento.fechaFin = new Date().toISOString();
      escribir(estado);
      return constancia(intento);
    },

    async obtenerConstancia(intentoId) {
      await esperar();
      const intento = buscar(leer(), intentoId);
      if (intento.estado !== 'FINALIZADO')
        fallar(409, 'INTENTO_EN_CURSO', 'El intento aún no se finaliza.', 'weill');
      return constancia(intento);
    },

    async obtenerResultado(intentoId) {
      await esperar();
      const intento = buscar(leer(), intentoId);
      if (intento.estado !== 'FINALIZADO')
        fallar(409, 'INTENTO_EN_CURSO', 'El intento aún no se finaliza.', 'weill');
      // Sin reglas de calificación aprobadas: todo queda sin calcular.
      const resultado: ResultadoWeill = {
        intentoId,
        estado: 'PENDIENTE_VALIDACION',
        puntajeDirecto: null,
        subtotales: Array.from({ length: TOTAL_LAMINAS }, (_, i) => ({
          lamina: i + 1,
          puntaje: null,
        })),
        grupoBaremo: null,
        percentil: null,
        ci: null,
        categoria: null,
        versionClave: null,
        versionBaremo: null,
      };
      return resultado;
    },
  };
}
