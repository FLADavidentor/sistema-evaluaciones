import type { ClienteCatalogo, DetalleCampo, TipoRespuesta } from '../evaluacion/tipos';

/** Esquemas de DOC-05 para E25–E31 (administración de versiones de formulario). */

export type EstadoVersion = 'BORRADOR' | 'PUBLICADA' | 'RETIRADA';

export interface VersionFormularioResponse {
  id: number;
  testId: number;
  estado: EstadoVersion;
}

export interface OpcionRespuesta {
  letra: string;
  texto: string;
}

export interface EjemploPractica {
  numero?: number;
  enunciado?: string;
  opciones?: OpcionRespuesta[];
  retroalimentacion?: string;
}

export interface ConfiguracionSubpruebaRequest {
  orden?: number;
  tiempoLimiteSegundos?: number;
  tipoRespuesta?: TipoRespuesta;
  opciones?: number | null;
  maximoEntradas?: number | null;
  tienePractica?: boolean;
  instrucciones?: string;
  ejemplos?: EjemploPractica[];
}

export interface PreguntaRequest {
  numeroVisible: number;
  ordenPresentacion: number;
  enunciado: string;
  recursoRef?: string | null;
}

export interface PreguntaResponse extends PreguntaRequest {
  id: number;
}

export interface OpcionesRequest {
  opciones: OpcionRespuesta[];
}

export interface ClaveRequest {
  entradas: { preguntaId: number; opcion: string }[];
}

export interface RangoBaremo {
  idFactor: string;
  percentil: number;
  limiteInferior?: number | null;
  limiteSuperior?: number | null;
  estadoCelda: 'RANGO' | 'SIN_DATO';
  valorOriginal?: string;
  localizadorFuente?: string;
}

export interface BaremoRequest {
  nombre: string;
  version: string;
  anioNorma: number;
  poblacionReferencia?: string;
  referenciaFuente?: string;
  rangos: RangoBaremo[];
}

/** Puerto de administración: lo implementan el servicio real y el mock. */
export interface ClienteAdministracion extends ClienteCatalogo {
  crearVersion(testId: number): Promise<VersionFormularioResponse>;
  guardarConfiguracion(
    versionId: number,
    codigo: string,
    solicitud: ConfiguracionSubpruebaRequest,
  ): Promise<ConfiguracionSubpruebaRequest>;
  agregarPregunta(
    versionId: number,
    codigo: string,
    solicitud: PreguntaRequest,
  ): Promise<PreguntaResponse>;
  guardarOpciones(
    versionId: number,
    preguntaId: number,
    solicitud: OpcionesRequest,
  ): Promise<OpcionesRequest>;
  cargarClave(versionId: number, solicitud: ClaveRequest): Promise<{ idClave: number }>;
  cargarBaremo(solicitud: BaremoRequest): Promise<{ idBaremo: number }>;
  publicar(versionId: number): Promise<VersionFormularioResponse>;
}

export type ErroresValidacion = DetalleCampo[];
