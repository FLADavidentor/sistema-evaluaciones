import { ApiError } from '../../../services/http';
import { MATERIAL_ESPACIAL } from '../espacial/material';
import { MATERIAL_VERBAL } from '../verbal/material';
import type { BfaApi } from './bfaApi';
import type {
  AvanceSubpruebaResponse,
  EstadoSubprueba,
  EvaluacionResponse,
  IniciarEvaluacionRequest,
  InstruccionesResponse,
  PalabraRegistrada,
  Pregunta,
  PreguntasSubpruebaResponse,
  RegistrarRespuestasRequest,
  SubpruebaActivaResponse,
  SubpruebaConfig,
  TestDetalle,
  TestResumen,
} from './tipos';

// API en memoria que aplica las reglas del servidor descritas en DOC-05 (orden, una subprueba
// activa, cierre por tiempo, sin regreso). Sirve para desarrollar y probar el flujo mientras no
// exista backend o los mocks de INT-02. El contenido es de ejemplo, no son reactivos del BFA.

const SELECCION = 'SELECCION' as const;
// Códigos, orden, tiempos y alternativas: Documento BFA §2 y E2. En S1 y S2 el documento no
// fija el número de alternativas: se usan 4.
const CATALOGO: Omit<SubpruebaConfig, 'numeroPreguntas' | 'tienePractica' | 'maximoEntradas'>[] = [
  {
    codigo: 'VOC1',
    nombre: 'Vocabulario - Forma A',
    orden: 1,
    factor: 'VOC1',
    tiempoLimiteSegundos: 300,
    tipoRespuesta: SELECCION,
    opciones: 5,
  },
  {
    codigo: 'VOC2',
    nombre: 'Vocabulario - Forma B',
    orden: 2,
    factor: 'VOC2',
    tiempoLimiteSegundos: 360,
    tipoRespuesta: SELECCION,
    opciones: 5,
  },
  {
    codigo: 'S1',
    nombre: 'Espacial - Figuras Idénticas',
    orden: 3,
    factor: 'S1',
    tiempoLimiteSegundos: 180,
    tipoRespuesta: SELECCION,
    opciones: 4,
  },
  {
    codigo: 'S2',
    nombre: 'Espacial - Desplazamiento',
    orden: 4,
    factor: 'S2',
    tiempoLimiteSegundos: 300,
    tipoRespuesta: SELECCION,
    opciones: 4,
  },
  {
    codigo: 'S1b',
    nombre: 'Espacial - Ladrillos-Cubos',
    orden: 5,
    factor: 'S1',
    tiempoLimiteSegundos: 210,
    tipoRespuesta: SELECCION,
    opciones: 5,
  },
  {
    codigo: 'R1',
    nombre: 'Razonamiento - Forma A',
    orden: 6,
    factor: 'R1',
    tiempoLimiteSegundos: 600,
    tipoRespuesta: SELECCION,
    opciones: 4,
  },
  {
    codigo: 'R2',
    nombre: 'Razonamiento - Forma B',
    orden: 7,
    factor: 'R2',
    tiempoLimiteSegundos: 720,
    tipoRespuesta: SELECCION,
    opciones: 4,
  },
  {
    codigo: 'CV',
    nombre: 'Comprensión Verbal',
    orden: 8,
    factor: 'CV',
    tiempoLimiteSegundos: 900,
    tipoRespuesta: SELECCION,
    opciones: 3,
  },
  {
    codigo: 'N1-A',
    nombre: 'Numérico - Sumas',
    orden: 9,
    factor: 'N1',
    tiempoLimiteSegundos: 240,
    tipoRespuesta: SELECCION,
    opciones: 2,
  },
  {
    codigo: 'N1-B',
    nombre: 'Numérico - Multiplicaciones',
    orden: 10,
    factor: 'N1',
    tiempoLimiteSegundos: 240,
    tipoRespuesta: SELECCION,
    opciones: 2,
  },
  {
    codigo: 'N2-A',
    nombre: 'Numérico - Operaciones',
    orden: 11,
    factor: 'N2',
    tiempoLimiteSegundos: 360,
    tipoRespuesta: SELECCION,
    opciones: 4,
  },
  {
    codigo: 'N2-B',
    nombre: 'Numérico - Problemas',
    orden: 12,
    factor: 'N2',
    tiempoLimiteSegundos: 360,
    tipoRespuesta: SELECCION,
    opciones: 4,
  },
  {
    codigo: 'FV',
    nombre: 'Fluidez Verbal',
    orden: 13,
    factor: 'FV',
    tiempoLimiteSegundos: 300,
    tipoRespuesta: 'TEXTO_LIBRE',
    opciones: null,
  },
];

// Material FICTICIO de ejemplo para desarrollar y probar R1 y R2. No son reactivos del BFA ni
// llevan clave: E6 nunca devuelve la respuesta correcta. DOC-08 definirá el material de ejercicios.
const EJEMPLOS_R1: [string, string[]][] = [
  ['2, 4, 8, 16, ___', ['20', '24', '32', '64']],
  ['5, 10, 15, 20, ___', ['22', '25', '30', '35']],
  ['1, 4, 9, 16, ___', ['20', '24', '25', '36']],
  ['100, 90, 80, 70, ___', ['50', '55', '60', '65']],
  ['3, 6, 5, 10, 9, ___', ['12', '14', '18', '20']],
  ['1, 2, 4, 7, 11, ___', ['14', '15', '16', '18']],
];

const EJEMPLOS_R2: [string, string[]][] = [
  ['A, C, E, G, ___', ['H', 'I', 'J', 'K']],
  ['frío : calor :: noche : ___', ['día', 'sol', 'luna', 'hora']],
  ['Pie es a zapato como mano es a ___', ['guante', 'dedo', 'brazo', 'anillo']],
  ['Z, X, V, T, ___', ['S', 'R', 'Q', 'P']],
  ['grande : pequeño :: alto : ___', ['bajo', 'ancho', 'largo', 'corto']],
  ['Ojo es a ver como oído es a ___', ['oír', 'sonido', 'oreja', 'ruido']],
];

const EJEMPLOS_POR_SUBPRUEBA: Record<string, [string, string[]][]> = {
  ...MATERIAL_VERBAL,
  R1: EJEMPLOS_R1,
  R2: EJEMPLOS_R2,
};

export interface OpcionesApiSimulada {
  /** Reloj inyectable; por defecto `Date.now`. */
  ahora?: () => number;
  /** Preguntas por subprueba de selección. */
  preguntasPorSubprueba?: number;
  /** Sustituye el tiempo oficial de todas las subpruebas (útil para verlas vencer en desarrollo). */
  duracionSegundos?: number;
  /** Subpruebas sin práctica. */
  sinPractica?: string[];
  /** Ejemplos de práctica por subprueba que la tiene. */
  ejemplosPractica?: number;
  /** Si se da, el estado sobrevive a recargar la página (así se puede probar la recuperación). */
  almacen?: Pick<Storage, 'getItem' | 'setItem'>;
}

interface EjecucionSimulada {
  codigo: string;
  estado: EstadoSubprueba;
  inicioMs?: number;
  finMs?: number;
  respuestas: Map<number, string>;
  palabras: PalabraRegistrada[];
}

interface EvaluacionSimulada {
  id: number;
  solicitud: IniciarEvaluacionRequest;
  estado: 'EN_CURSO' | 'FINALIZADA';
  inicioMs: number;
  finMs: number | null;
  letraInicial: string | null;
  ejecuciones: EjecucionSimulada[];
}

function fallo(status: number, codigo: string, mensaje: string, ruta: string): ApiError {
  return new ApiError(status, {
    timestamp: new Date().toISOString(),
    status,
    codigo,
    mensaje,
    ruta,
  });
}

export class BfaApiSimulada implements BfaApi {
  readonly simulada = true;
  private readonly ahora: () => number;
  private readonly preguntasPorSubprueba: number;
  private readonly ejemplosPractica: number;
  private readonly configuraciones: SubpruebaConfig[];
  private readonly evaluaciones = new Map<number, EvaluacionSimulada>();
  private siguienteId = 15;
  private readonly almacen?: OpcionesApiSimulada['almacen'];

  constructor(opciones: OpcionesApiSimulada = {}) {
    this.ahora = opciones.ahora ?? Date.now;
    this.almacen = opciones.almacen;
    this.preguntasPorSubprueba = opciones.preguntasPorSubprueba ?? 3;
    this.ejemplosPractica = opciones.ejemplosPractica ?? 1;
    this.configuraciones = CATALOGO.map((base) => {
      const esTexto = base.tipoRespuesta === 'TEXTO_LIBRE';
      return {
        ...base,
        tiempoLimiteSegundos: opciones.duracionSegundos ?? base.tiempoLimiteSegundos,
        numeroPreguntas: esTexto ? 0 : this.preguntasPorSubprueba,
        maximoEntradas: esTexto ? 75 : null,
        tienePractica: !opciones.sinPractica?.includes(base.codigo),
      };
    });
    this.restaurar();
  }

  private persistir() {
    if (!this.almacen) return;
    const datos = [...this.evaluaciones.values()].map((e) => ({
      ...e,
      ejecuciones: e.ejecuciones.map((x) => ({ ...x, respuestas: [...x.respuestas] })),
    }));
    this.almacen.setItem('bfa-simulada', JSON.stringify({ siguienteId: this.siguienteId, datos }));
  }

  private restaurar() {
    const crudo = this.almacen?.getItem('bfa-simulada');
    if (!crudo) return;
    try {
      const { siguienteId, datos } = JSON.parse(crudo) as {
        siguienteId: number;
        datos: (Omit<EvaluacionSimulada, 'ejecuciones'> & {
          ejecuciones: (Omit<EjecucionSimulada, 'respuestas'> & {
            respuestas: [number, string][];
          })[];
        })[];
      };
      this.siguienteId = siguienteId;
      for (const e of datos) {
        this.evaluaciones.set(e.id, {
          ...e,
          ejecuciones: e.ejecuciones.map((x) => ({ ...x, respuestas: new Map(x.respuestas) })),
        });
      }
    } catch {
      // Estado guardado ilegible: se empieza de cero.
    }
  }

  async listarTests(): Promise<TestResumen[]> {
    return [
      { id: 1, codigo: 'BFA', nombre: 'Batería Factorial de Aptitudes', numeroSubpruebas: 13 },
    ];
  }

  async obtenerTest(testId: number): Promise<TestDetalle> {
    if (testId !== 1)
      throw fallo(404, 'TEST_NO_ENCONTRADO', 'El test no existe.', `/api/v1/tests/${testId}`);
    return {
      id: 1,
      codigo: 'BFA',
      nombre: 'Batería Factorial de Aptitudes',
      versionFormularioId: 10,
      subpruebas: this.configuraciones,
    };
  }

  async iniciarEvaluacion(solicitud: IniciarEvaluacionRequest): Promise<EvaluacionResponse> {
    const ruta = '/api/v1/evaluaciones';
    const { versionFormularioId, sujetoId, periodoId } = solicitud;
    if (![versionFormularioId, sujetoId, periodoId].every((v) => Number.isInteger(v))) {
      throw fallo(400, 'SOLICITUD_INVALIDA', 'Faltan campos obligatorios.', ruta);
    }
    if (versionFormularioId !== 10) {
      throw fallo(422, 'VERSION_INCOMPATIBLE', 'La edición no corresponde al test.', ruta);
    }
    const codigos = this.configuraciones.map((c) => c.codigo);
    const incluidas = solicitud.subpruebas
      ? codigos.filter((c) => solicitud.subpruebas?.includes(c))
      : codigos;
    if (incluidas.length === 0 || (solicitud.subpruebas ?? []).some((c) => !codigos.includes(c))) {
      throw fallo(422, 'SUBPRUEBA_NO_INCLUIDA', 'Subprueba desconocida.', ruta);
    }
    if (incluidas.includes('FV') && !solicitud.fluidez?.letraInicial) {
      throw fallo(409, 'LETRA_NO_ASIGNADA', 'FV exige una letra inicial.', ruta);
    }
    const evaluacion: EvaluacionSimulada = {
      id: this.siguienteId++,
      solicitud,
      estado: 'EN_CURSO',
      inicioMs: this.ahora(),
      finMs: null,
      letraInicial: solicitud.fluidez?.letraInicial ?? null,
      ejecuciones: incluidas.map((codigo) => ({
        codigo,
        estado: 'PENDIENTE',
        respuestas: new Map(),
        palabras: [],
      })),
    };
    this.evaluaciones.set(evaluacion.id, evaluacion);
    this.persistir();
    return this.vista(evaluacion);
  }

  async obtenerEvaluacion(evaluacionId: number): Promise<EvaluacionResponse> {
    const evaluacion = this.buscar(evaluacionId);
    this.reconciliar(evaluacion);
    return this.vista(evaluacion);
  }

  async consultarInstrucciones(
    evaluacionId: number,
    codigo: string,
  ): Promise<InstruccionesResponse> {
    const evaluacion = this.buscar(evaluacionId);
    const ruta = `/api/v1/evaluaciones/${evaluacionId}/subpruebas/${codigo}/instrucciones`;
    if (!evaluacion.ejecuciones.some((e) => e.codigo === codigo)) {
      throw fallo(404, 'SUBPRUEBA_NO_ENCONTRADA', 'La subprueba no existe.', ruta);
    }
    const config = this.config(codigo);
    const letras = 'ABCDE'.slice(0, config.opciones ?? 0).split('');
    return {
      codigo,
      instrucciones: `Instrucciones de ejemplo de ${config.nombre}. Contenido ilustrativo, no es el texto oficial.`,
      ejemplos: config.tienePractica
        ? Array.from({ length: this.ejemplosPractica }, (_, i) => ({
            numero: i + 1,
            enunciado: `Ejemplo de práctica ${i + 1} (${codigo})`,
            opciones: letras.map((letra) => ({ letra, texto: `Alternativa ${letra}` })),
            retroalimentacion: `Retroalimentación de ejemplo ${i + 1}.`,
          }))
        : [],
    };
  }

  async iniciarSubprueba(evaluacionId: number, codigo: string): Promise<SubpruebaActivaResponse> {
    const evaluacion = this.buscar(evaluacionId);
    const ruta = `/api/v1/evaluaciones/${evaluacionId}/subpruebas/${codigo}/iniciar`;
    this.reconciliar(evaluacion);
    const ejecucion = evaluacion.ejecuciones.find((e) => e.codigo === codigo);
    if (!ejecucion) throw fallo(404, 'SUBPRUEBA_NO_ENCONTRADA', 'La subprueba no existe.', ruta);
    // Repetir el inicio de la subprueba activa devuelve el mismo inicio y fin (CU-BFA-P05).
    if (ejecucion.estado === 'ACTIVA') return this.respuestaInicio(evaluacion, ejecucion);
    if (evaluacion.ejecuciones.some((e) => e.estado === 'ACTIVA')) {
      throw fallo(409, 'HAY_SUBPRUEBA_ACTIVA', 'Ya hay una subprueba activa.', ruta);
    }
    if (ejecucion.estado === 'CERRADA')
      throw fallo(409, 'SUBPRUEBA_CERRADA', 'La subprueba ya se cerró.', ruta);
    const siguiente = evaluacion.ejecuciones.find((e) => e.estado === 'PENDIENTE');
    if (siguiente?.codigo !== codigo)
      throw fallo(409, 'SUBPRUEBA_FUERA_DE_ORDEN', 'No es la siguiente subprueba.', ruta);
    if (codigo === 'FV' && !evaluacion.letraInicial)
      throw fallo(409, 'LETRA_NO_CONFIGURADA', 'FV sin letra.', ruta);

    const inicioMs = this.ahora();
    ejecucion.estado = 'ACTIVA';
    ejecucion.inicioMs = inicioMs;
    const limite = this.config(codigo).tiempoLimiteSegundos;
    if (limite === null) throw new Error('El simulador solo modela subpruebas con tiempo oficial');
    ejecucion.finMs = inicioMs + limite * 1000;
    this.persistir();
    return this.respuestaInicio(evaluacion, ejecucion);
  }

  private respuestaInicio(
    evaluacion: EvaluacionSimulada,
    ejecucion: EjecucionSimulada,
  ): SubpruebaActivaResponse {
    const { codigo } = ejecucion;
    return {
      codigo,
      estado: 'ACTIVA',
      inicio: new Date(ejecucion.inicioMs ?? 0).toISOString(),
      finLimite: new Date(ejecucion.finMs ?? 0).toISOString(),
      segundosRestantes: this.segundos(ejecucion),
      ...(codigo === 'FV' && evaluacion.letraInicial
        ? { letraInicial: evaluacion.letraInicial }
        : {}),
    };
  }

  async obtenerPreguntas(
    evaluacionId: number,
    codigo: string,
  ): Promise<PreguntasSubpruebaResponse> {
    const evaluacion = this.buscar(evaluacionId);
    const ejecucion = this.activa(
      evaluacion,
      codigo,
      `/api/v1/evaluaciones/${evaluacionId}/subpruebas/${codigo}/preguntas`,
    );
    const config = this.config(codigo);
    const respuesta: PreguntasSubpruebaResponse = {
      codigo,
      segundosRestantes: this.segundos(ejecucion),
      preguntas: config.tipoRespuesta === SELECCION ? this.preguntas(config, ejecucion) : [],
    };
    if (config.tipoRespuesta === 'TEXTO_LIBRE') {
      respuesta.palabras = ejecucion.palabras;
      respuesta.letraInicial = evaluacion.letraInicial;
    }
    return respuesta;
  }

  async registrarRespuestas(
    evaluacionId: number,
    codigo: string,
    cuerpo: RegistrarRespuestasRequest,
  ): Promise<AvanceSubpruebaResponse> {
    const evaluacion = this.buscar(evaluacionId);
    const ruta = `/api/v1/evaluaciones/${evaluacionId}/subpruebas/${codigo}/respuestas`;
    const ejecucion = this.activa(evaluacion, codigo, ruta, true);
    const config = this.config(codigo);
    if ('respuestas' in cuerpo) {
      const preguntas = this.preguntas(config, ejecucion);
      for (const { preguntaId, opcion } of cuerpo.respuestas) {
        const pregunta = preguntas.find((p) => p.id === preguntaId);
        if (!pregunta?.opciones.some((o) => o.letra === opcion)) {
          throw fallo(422, 'RESPUESTA_INVALIDA', 'La opción no pertenece a la pregunta.', ruta);
        }
      }
      for (const { preguntaId, opcion } of cuerpo.respuestas)
        ejecucion.respuestas.set(preguntaId, opcion);
    } else {
      // El código de cada rechazo está pendiente (consulta C-7 de GEN-03); se usa 400.
      const maximo = config.maximoEntradas ?? 0;
      const ordenes = new Set(cuerpo.palabras.map((p) => p.ordenEntrada));
      if (
        cuerpo.palabras.length > maximo ||
        ordenes.size !== cuerpo.palabras.length ||
        cuerpo.palabras.some(
          (p) => p.texto.trim() === '' || p.ordenEntrada < 1 || p.ordenEntrada > maximo,
        )
      ) {
        throw fallo(400, 'SOLICITUD_INVALIDA', 'Palabras fuera del contrato de E7.', ruta);
      }
      ejecucion.palabras = cuerpo.palabras;
    }
    this.persistir();
    return {
      codigo,
      registradas: 'respuestas' in cuerpo ? cuerpo.respuestas.length : cuerpo.palabras.length,
      totalRespondidas: ejecucion.respuestas.size + ejecucion.palabras.length,
      segundosRestantes: this.segundos(ejecucion),
    };
  }

  async finalizarEvaluacion(evaluacionId: number): Promise<EvaluacionResponse> {
    const evaluacion = this.buscar(evaluacionId);
    this.reconciliar(evaluacion);
    if (evaluacion.estado === 'FINALIZADA') return this.vista(evaluacion);
    if (evaluacion.ejecuciones.some((e) => e.estado !== 'CERRADA')) {
      throw fallo(
        409,
        'SUBPRUEBAS_PENDIENTES',
        'Hay subpruebas sin cerrar.',
        `/api/v1/evaluaciones/${evaluacionId}/finalizar`,
      );
    }
    evaluacion.estado = 'FINALIZADA';
    evaluacion.finMs = this.ahora();
    this.persistir();
    return this.vista(evaluacion);
  }

  /** Palabras de FV registradas, por orden: insumo del E10 simulado. */
  palabrasFv(evaluacionId: number): PalabraRegistrada[] {
    const fv = this.buscar(evaluacionId).ejecuciones.find((e) => e.codigo === 'FV');
    return [...(fv?.palabras ?? [])].sort((a, b) => a.ordenEntrada - b.ordenEntrada);
  }

  // --- Reglas internas -------------------------------------------------------------------

  private config(codigo: string): SubpruebaConfig {
    return this.configuraciones.find((c) => c.codigo === codigo) as SubpruebaConfig;
  }

  private buscar(evaluacionId: number): EvaluacionSimulada {
    const evaluacion = this.evaluaciones.get(evaluacionId);
    if (!evaluacion) {
      throw fallo(
        404,
        'EVALUACION_NO_ENCONTRADA',
        'La evaluación no existe.',
        `/api/v1/evaluaciones/${evaluacionId}`,
      );
    }
    return evaluacion;
  }

  /** El servidor cierra solo lo que ya venció; el cliente nunca decide el cierre. */
  private reconciliar(evaluacion: EvaluacionSimulada) {
    for (const e of evaluacion.ejecuciones) {
      if (e.estado === 'ACTIVA' && e.finMs !== undefined && this.ahora() >= e.finMs)
        e.estado = 'CERRADA';
    }
  }

  private activa(
    evaluacion: EvaluacionSimulada,
    codigo: string,
    ruta: string,
    escritura = false,
  ): EjecucionSimulada {
    const ejecucion = evaluacion.ejecuciones.find((e) => e.codigo === codigo);
    if (!ejecucion) throw fallo(404, 'SUBPRUEBA_NO_ENCONTRADA', 'La subprueba no existe.', ruta);
    const vencida =
      ejecucion.estado === 'ACTIVA' &&
      ejecucion.finMs !== undefined &&
      this.ahora() >= ejecucion.finMs;
    this.reconciliar(evaluacion);
    if (vencida && escritura)
      throw fallo(409, 'TIEMPO_AGOTADO', 'El tiempo de la subprueba terminó.', ruta);
    if (ejecucion.estado !== 'ACTIVA')
      throw fallo(409, 'SUBPRUEBA_NO_ACTIVA', 'La subprueba no está activa.', ruta);
    return ejecucion;
  }

  private segundos(ejecucion: EjecucionSimulada): number {
    return Math.max(0, Math.ceil(((ejecucion.finMs ?? this.ahora()) - this.ahora()) / 1000));
  }

  private vista(evaluacion: EvaluacionSimulada): EvaluacionResponse {
    const activa = evaluacion.ejecuciones.find((e) => e.estado === 'ACTIVA');
    return {
      id: evaluacion.id,
      testId: 1,
      sujetoId: evaluacion.solicitud.sujetoId,
      periodoId: evaluacion.solicitud.periodoId,
      estado: evaluacion.estado,
      fechaInicio: new Date(evaluacion.inicioMs).toISOString(),
      fechaFin: evaluacion.finMs === null ? null : new Date(evaluacion.finMs).toISOString(),
      subpruebaActiva: activa
        ? {
            codigo: activa.codigo,
            finLimite: new Date(activa.finMs ?? 0).toISOString(),
            segundosRestantes: this.segundos(activa),
          }
        : null,
      subpruebas: evaluacion.ejecuciones.map(({ codigo, estado }) => ({ codigo, estado })),
      ...(evaluacion.estado === 'FINALIZADA'
        ? { resultadoId: evaluacion.id, estadoResultado: 'PENDIENTE_VALIDACION' }
        : {}),
    };
  }

  /** Preguntas de ejemplo. VOC2 usa la numeración de la hoja (41 en adelante). */
  private preguntas(config: SubpruebaConfig, ejecucion: EjecucionSimulada): Pregunta[] {
    const base = config.codigo === 'VOC2' ? 40 : 0;
    const letras = 'ABCDE'.slice(0, config.opciones ?? 0).split('');
    const ejemplos = EJEMPLOS_POR_SUBPRUEBA[config.codigo];
    const figuras = MATERIAL_ESPACIAL[config.codigo];
    return Array.from({ length: config.numeroPreguntas }, (_, i) => {
      const numero = base + i + 1;
      const id = config.orden * 1000 + numero;
      const ejemplo = ejemplos?.[i % ejemplos.length];
      const figura = figuras?.[i % figuras.length];
      return {
        id,
        numero,
        enunciado: ejemplo
          ? ejemplo[0]
          : (figura?.enunciado ?? `Pregunta de ejemplo ${numero} (${config.codigo})`),
        ...(figura ? { recursoUrl: figura.estimulo } : {}),
        opciones: letras.map((letra, j) => ({
          letra,
          texto: ejemplo
            ? (ejemplo[1][j] ?? '')
            : figura
              ? `Figura ${letra}`
              : `Alternativa ${letra}`,
          ...(figura ? { recursoUrl: figura.opciones[j] } : {}),
        })),
        respuestaActual: ejecucion.respuestas.get(id) ?? null,
      };
    });
  }
}

/** Instancia por defecto: en desarrollo, `?tiempo=20` acorta todas las subpruebas a 20 s. */
export function crearApiSimulada(): BfaApiSimulada {
  const tiempo = Number(new URLSearchParams(globalThis.location?.search).get('tiempo'));
  return new BfaApiSimulada({
    ...(tiempo > 0 ? { duracionSegundos: tiempo } : {}),
    almacen: globalThis.sessionStorage,
  });
}
