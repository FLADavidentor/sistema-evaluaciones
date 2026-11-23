import { ApiError } from '../../../services/http';
import type { SaveState } from '../../../components/SaveStatus';
import type { BfaApi } from '../api/bfaApi';
import type {
  EvaluacionResponse,
  InstruccionesResponse,
  PalabraRegistrada,
  Pregunta,
  SubpruebaConfig,
  TestDetalle,
} from '../api/tipos';

export interface ErrorFlujo {
  codigo: string;
  mensaje: string;
  /** `true` si volver a cargar el estado oficial puede resolverlo. */
  reintentable: boolean;
}

export interface EstadoEjecucion {
  fase: 'ejecucion';
  subprueba: SubpruebaConfig;
  posicion: number;
  total: number;
  preguntas: Pregunta[];
  respuestas: Record<number, string>;
  palabras: string[];
  letraInicial: string | null;
  indice: number;
  /** Ya vio la última pregunta: espera el cierre oficial (no hay cierre anticipado). */
  alFinal: boolean;
  guardado: SaveState;
  /** Instante local (ms) en que vence el tiempo, derivado del segundero del servidor. */
  finMs: number;
  recuperada: boolean;
}

export type EstadoFlujo =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ErrorFlujo }
  | {
      fase: 'preparacion';
      paso: 'instrucciones' | 'practica';
      subprueba: SubpruebaConfig;
      posicion: number;
      total: number;
      /** E24; `null` mientras el backend no lo implemente (se usan textos provisionales). */
      contenido: InstruccionesResponse | null;
      /** Ejemplo de práctica que se está viendo y la alternativa que eligió. */
      ejemplo: number;
      seleccion: string | null;
    }
  | { fase: 'iniciando'; subprueba: SubpruebaConfig }
  | EstadoEjecucion
  | {
      fase: 'transicion';
      cerrada: SubpruebaConfig;
      siguiente: SubpruebaConfig | null;
      posicion: number;
      total: number;
      /** Esperando que el servidor confirme el cierre. */
      cerrando: boolean;
    }
  | { fase: 'listaParaFinalizar'; finalizando: boolean }
  | { fase: 'finalizada'; estadoResultado: string | null };

const MENSAJES: Record<string, string> = {
  EVALUACION_NO_ENCONTRADA: 'No se encontró la evaluación.',
  TEST_NO_ENCONTRADO: 'No se encontró el test.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  SOLICITUD_INVALIDA: 'La solicitud no es válida.',
  RESPUESTA_INVALIDA: 'La respuesta no corresponde a la pregunta.',
  ERROR_INTERNO: 'El servidor tuvo un problema. Intenta de nuevo.',
  RUTA_NO_ENCONTRADA: 'El servicio solicitado no está disponible.',
  SUJETO_NO_ENCONTRADO: 'No se encontró a la persona evaluada.',
  PERIODO_NO_ENCONTRADO: 'No se encontró el periodo.',
  VERSION_NO_PUBLICADA: 'La edición del test aún no está publicada.',
  VERSION_INCOMPATIBLE: 'La edición no corresponde a este test.',
  SUBPRUEBA_NO_INCLUIDA: 'La subprueba no forma parte de la evaluación.',
  EVALUACION_EN_CURSO: 'Esta persona ya tiene una evaluación abierta en este periodo.',
  LETRA_NO_ASIGNADA: 'Fluidez Verbal necesita una letra asignada antes de comenzar.',
  NO_AUTENTICADO: 'Tu sesión terminó. Vuelve a ingresar para continuar.',
  SUBPRUEBA_FUERA_DE_ORDEN: 'Esa subprueba no es la siguiente. Se recargará el estado oficial.',
  HAY_SUBPRUEBA_ACTIVA: 'Ya hay una subprueba en curso. Se recargará el estado oficial.',
  SUBPRUEBA_CERRADA: 'Esa subprueba ya está cerrada y no puede repetirse.',
  SUBPRUEBA_NO_ACTIVA: 'La subprueba ya no está activa.',
  SUBPRUEBAS_PENDIENTES: 'Aún hay subpruebas sin cerrar.',
  LETRA_NO_CONFIGURADA: 'Fluidez Verbal no tiene letra asignada.',
  LETRA_NO_DISPONIBLE: 'No se pudo recuperar la letra de Fluidez Verbal.',
  CONFIGURACION_INCOMPLETA: 'La configuración de la subprueba no está disponible.',
  CIERRE_NO_CONFIRMADO: 'No se pudo confirmar el cierre de la subprueba.',
  SIN_CONEXION: 'No hay conexión con el servidor.',
};

export function normalizarError(e: unknown): ErrorFlujo {
  if (e instanceof ApiError) {
    const codigo = e.error?.codigo ?? `HTTP_${e.status}`;
    return {
      codigo,
      mensaje: MENSAJES[codigo] ?? e.error?.mensaje ?? 'No se pudo completar la operación.',
      reintentable: e.status >= 500 || e.status === 409,
    };
  }
  if (e instanceof Error && e.message in MENSAJES) {
    return {
      codigo: e.message,
      mensaje: MENSAJES[e.message],
      reintentable: e.message === 'CIERRE_NO_CONFIRMADO',
    };
  }
  return { codigo: 'SIN_CONEXION', mensaje: MENSAJES.SIN_CONEXION, reintentable: true };
}

const esCierre = (e: unknown) =>
  e instanceof ApiError &&
  ['TIEMPO_AGOTADO', 'SUBPRUEBA_NO_ACTIVA'].includes(e.error?.codigo ?? '');

const aRegistro = (palabras: string[]): PalabraRegistrada[] =>
  palabras.flatMap((texto, i) => (texto.trim() === '' ? [] : [{ ordenEntrada: i + 1, texto }]));

const MAX_SONDEOS = 10;

export interface OpcionesControlador {
  /** Reloj inyectable (pruebas). */
  ahora?: () => number;
  /** Espera antes de guardar palabras de Fluidez Verbal. */
  esperaGuardadoMs?: number;
  /** Intervalo entre consultas mientras se confirma el cierre. */
  intervaloSondeoMs?: number;
  /**
   * Dónde recordar la letra de FV de este navegador. Es un respaldo temporal: la letra debería
   * volver en E4 o E6 (consulta C-7). Por defecto, `sessionStorage` si existe.
   */
  almacenLetra?: Pick<Storage, 'getItem' | 'setItem'> | null;
}

/**
 * Flujo general de la batería BFA. Obedece al backend: orden, estado y tiempo salen de E2/E4;
 * el cliente no salta subpruebas, no reabre las cerradas y no decide el cierre.
 * No conoce React, así que se prueba sin navegador.
 */
export class ControladorBfa {
  private estado: EstadoFlujo = { fase: 'cargando' };
  private readonly oyentes = new Set<() => void>();
  private test: TestDetalle | null = null;
  private evaluacion: EvaluacionResponse | null = null;
  private respuestas = new Map<number, string>();
  private pendientes = new Map<number, string>();
  private palabras: string[] = [];
  private palabrasPendientes = false;
  private temporizadorGuardado: ReturnType<typeof setTimeout> | null = null;
  private guardando = false;
  private ocupado = false;
  private sondeando = false;
  private generacion = 0;
  private ultimoSondeo = 0;
  private intentosSondeo = 0;
  private ejecucionPrevia: EstadoEjecucion | null = null;
  private readonly ahora: () => number;
  private readonly esperaGuardadoMs: number;
  private readonly intervaloSondeoMs: number;
  private readonly almacenLetra: Pick<Storage, 'getItem' | 'setItem'> | null;

  constructor(
    private readonly api: BfaApi,
    private readonly evaluacionId: number,
    opciones: OpcionesControlador = {},
  ) {
    this.ahora = opciones.ahora ?? Date.now;
    this.esperaGuardadoMs = opciones.esperaGuardadoMs ?? 300;
    this.intervaloSondeoMs = opciones.intervaloSondeoMs ?? 2000;
    this.almacenLetra =
      opciones.almacenLetra !== undefined
        ? opciones.almacenLetra
        : typeof sessionStorage === 'undefined'
          ? null
          : sessionStorage;
  }

  // --- Suscripción (useSyncExternalStore) ------------------------------------------------

  suscribir = (oyente: () => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  obtenerEstado = () => this.estado;

  /** Segundos que quedan según el reloj local anclado al segundero del servidor. */
  segundosRestantes(estado: EstadoEjecucion): number {
    return Math.max(0, Math.ceil((estado.finMs - this.ahora()) / 1000));
  }

  detener() {
    if (this.temporizadorGuardado) clearTimeout(this.temporizadorGuardado);
    this.temporizadorGuardado = null;
  }

  private fijar(estado: EstadoFlujo) {
    this.estado = estado;
    this.oyentes.forEach((oyente) => oyente());
  }

  private fallar(e: unknown) {
    this.fijar({ fase: 'error', error: normalizarError(e) });
  }

  // --- Carga y recuperación --------------------------------------------------------------

  /** Lee el estado oficial (E4) y decide dónde está la persona; también sirve para retomar tras una caída. */
  cargar = async () => {
    const g = ++this.generacion;
    this.detener();
    this.fijar({ fase: 'cargando' });
    try {
      const evaluacion = await this.api.obtenerEvaluacion(this.evaluacionId);
      const test = await this.api.obtenerTest(evaluacion.testId);
      if (g !== this.generacion) return;
      this.test = test;
      await this.resolver(evaluacion);
    } catch (e) {
      if (g === this.generacion) this.fallar(e);
    }
  };

  reintentar = () => this.cargar();

  private config(codigo: string): SubpruebaConfig {
    const config = this.test?.subpruebas.find((s) => s.codigo === codigo);
    if (!config) throw new Error('CONFIGURACION_INCOMPLETA');
    return config;
  }

  private posicionDe(codigo: string) {
    const lista = this.evaluacion?.subpruebas ?? [];
    return { posicion: lista.findIndex((s) => s.codigo === codigo) + 1, total: lista.length };
  }

  /** Instrucciones y práctica (E24). Si la ruta aún no existe se siguen usando los textos provisionales. */
  private async preparar(codigo: string): Promise<EstadoFlujo> {
    const subprueba = this.config(codigo);
    let contenido: InstruccionesResponse | null = null;
    try {
      contenido = await this.api.consultarInstrucciones(this.evaluacionId, codigo);
    } catch (e) {
      if (!(e instanceof ApiError && e.error?.codigo === 'RUTA_NO_ENCONTRADA')) throw e;
    }
    return {
      fase: 'preparacion',
      paso: 'instrucciones',
      subprueba,
      ...this.posicionDe(codigo),
      contenido,
      ejemplo: 0,
      seleccion: null,
    };
  }

  private async irAPreparacion(codigo: string) {
    this.fijar({ fase: 'cargando' });
    try {
      this.fijar(await this.preparar(codigo));
    } catch (e) {
      this.fallar(e);
    }
  }

  private async resolver(evaluacion: EvaluacionResponse) {
    this.evaluacion = evaluacion;
    if (evaluacion.estado === 'FINALIZADA') {
      this.fijar({ fase: 'finalizada', estadoResultado: evaluacion.estadoResultado ?? null });
      return;
    }
    const activa = evaluacion.subpruebas.find((s) => s.estado === 'ACTIVA');
    if (activa) return this.retomar(activa.codigo, evaluacion);
    const pendiente = evaluacion.subpruebas.find((s) => s.estado === 'PENDIENTE');
    this.fijar(
      pendiente
        ? await this.preparar(pendiente.codigo)
        : { fase: 'listaParaFinalizar', finalizando: false },
    );
  }

  private async retomar(codigo: string, evaluacion: EvaluacionResponse) {
    const config = this.config(codigo);
    const segundos = evaluacion.subpruebaActiva?.segundosRestantes ?? config.tiempoLimiteSegundos;
    if (segundos <= 0) {
      this.entrarEnCierre(config);
      return;
    }
    await this.mostrarPreguntas(config, segundos, true);
  }

  // --- Preparación e inicio --------------------------------------------------------------

  /** Acción principal de las pantallas de preparación, transición y cierre. */
  continuar = () => {
    const e = this.estado;
    if (e.fase === 'preparacion') {
      const ejemplos = e.contenido?.ejemplos.length ?? 0;
      if (e.paso === 'instrucciones') {
        // Con E24 solo hay práctica si trae ejemplos; sin E24 se mantiene la pantalla provisional.
        const hayPractica = e.subprueba.tienePractica && (e.contenido === null || ejemplos > 0);
        if (hayPractica) this.fijar({ ...e, paso: 'practica', ejemplo: 0, seleccion: null });
        else void this.iniciar(e.subprueba);
      } else if (e.ejemplo < ejemplos - 1) {
        this.fijar({ ...e, ejemplo: e.ejemplo + 1, seleccion: null });
      } else {
        void this.iniciar(e.subprueba);
      }
    } else if (e.fase === 'transicion' && !e.cerrando) {
      if (e.siguiente) void this.irAPreparacion(e.siguiente.codigo);
      else this.fijar({ fase: 'listaParaFinalizar', finalizando: false });
    } else if (e.fase === 'listaParaFinalizar' && !e.finalizando) {
      void this.finalizar();
    }
  };

  /** Elegir una alternativa en un ejemplo de práctica: se muestra la retroalimentación y nada se guarda. */
  seleccionarPractica = (letra: string) => {
    const e = this.estado;
    if (e.fase === 'preparacion' && e.paso === 'practica') this.fijar({ ...e, seleccion: letra });
  };

  private async iniciar(config: SubpruebaConfig) {
    if (this.ocupado) return;
    this.ocupado = true;
    this.fijar({ fase: 'iniciando', subprueba: config });
    try {
      const activa = await this.api.iniciarSubprueba(this.evaluacionId, config.codigo);
      await this.mostrarPreguntas(config, activa.segundosRestantes, false, activa.letraInicial);
    } catch (e) {
      this.fallar(e);
    } finally {
      this.ocupado = false;
    }
  }

  private async mostrarPreguntas(
    config: SubpruebaConfig,
    segundos: number,
    recuperada: boolean,
    letraE5?: string,
  ) {
    const r = await this.api.obtenerPreguntas(this.evaluacionId, config.codigo);
    this.respuestas = new Map(
      r.preguntas.flatMap((p) => (p.respuestaActual ? [[p.id, p.respuestaActual] as const] : [])),
    );
    this.pendientes = new Map();
    this.palabrasPendientes = false;
    this.palabras = [];
    for (const { ordenEntrada, texto } of r.palabras ?? []) this.palabras[ordenEntrada - 1] = texto;
    this.palabras = Array.from(this.palabras, (p) => p ?? '');
    const clave = `bfa-letra-${this.evaluacionId}`;
    const letra = r.letraInicial ?? letraE5 ?? this.almacenLetra?.getItem(clave) ?? null;
    if (letra) this.almacenLetra?.setItem(clave, letra);
    if (config.tipoRespuesta === 'TEXTO_LIBRE' && !letra) throw new Error('LETRA_NO_DISPONIBLE');

    const sinResponder = r.preguntas.findIndex((p) => !this.respuestas.has(p.id));
    const indice = recuperada
      ? sinResponder >= 0
        ? sinResponder
        : Math.max(0, r.preguntas.length - 1)
      : 0;
    this.fijar({
      fase: 'ejecucion',
      subprueba: config,
      ...this.posicionDe(config.codigo),
      preguntas: r.preguntas,
      respuestas: Object.fromEntries(this.respuestas),
      palabras: this.palabras,
      letraInicial: letra,
      indice,
      alFinal: false,
      guardado: 'saved',
      finMs: this.ahora() + (r.segundosRestantes ?? segundos) * 1000,
      recuperada,
    });
  }

  // --- Ejecución --------------------------------------------------------------------------

  seleccionar = (preguntaId: number, opcion: string) => {
    const e = this.estado;
    if (e.fase !== 'ejecucion' || e.alFinal) return;
    this.respuestas.set(preguntaId, opcion);
    this.pendientes.set(preguntaId, opcion);
    this.fijar({
      ...e,
      respuestas: Object.fromEntries(this.respuestas),
      guardado: 'saving',
      recuperada: false,
    });
    void this.guardar();
  };

  escribirPalabras = (palabras: string[]) => {
    const e = this.estado;
    if (e.fase !== 'ejecucion' || e.subprueba.tipoRespuesta !== 'TEXTO_LIBRE') return;
    this.palabras = palabras;
    this.palabrasPendientes = true;
    this.fijar({ ...e, palabras, guardado: 'saving', recuperada: false });
    if (this.temporizadorGuardado) clearTimeout(this.temporizadorGuardado);
    this.temporizadorGuardado = setTimeout(() => {
      this.temporizadorGuardado = null;
      void this.guardar();
    }, this.esperaGuardadoMs);
  };

  /** Avanza a la siguiente pregunta; tras la última queda esperando el cierre oficial. */
  siguiente = () => {
    const e = this.estado;
    if (e.fase !== 'ejecucion' || e.alFinal) return;
    if (this.pendientes.size > 0 || this.palabrasPendientes) {
      if (this.temporizadorGuardado) clearTimeout(this.temporizadorGuardado);
      this.temporizadorGuardado = null;
      void this.guardar();
    }
    const ultima =
      e.subprueba.tipoRespuesta === 'TEXTO_LIBRE' || e.indice >= e.preguntas.length - 1;
    this.fijar({
      ...e,
      indice: ultima ? e.indice : e.indice + 1,
      alFinal: ultima,
      recuperada: false,
    });
  };

  /** Vuelve a la pregunta anterior de la misma subprueba mientras siga activa (Documento BFA §5.2). */
  anterior = () => {
    const e = this.estado;
    if (e.fase !== 'ejecucion' || e.alFinal || e.indice <= 0) return;
    this.fijar({ ...e, indice: e.indice - 1, recuperada: false });
  };

  /** Tras la última pregunta, regresa a ella para revisar mientras siga activa. */
  revisar = () => {
    const e = this.estado;
    if (e.fase === 'ejecucion' && e.alFinal) this.fijar({ ...e, alFinal: false });
  };

  private marcarGuardado(guardado: SaveState) {
    const e = this.estado;
    if (e.fase === 'ejecucion' && e.guardado !== guardado) this.fijar({ ...e, guardado });
  }

  /** Envía lo pendiente (E7 es idempotente: reenviar es seguro). Si falla, reintenta en el próximo cambio. */
  private async guardar() {
    if (this.guardando) return;
    this.guardando = true;
    try {
      while (this.pendientes.size > 0 || this.palabrasPendientes) {
        const e = this.estado;
        if (e.fase !== 'ejecucion') return;
        const enviadas = new Map(this.pendientes);
        const instantanea = this.palabras.join('\n');
        const cuerpo =
          e.subprueba.tipoRespuesta === 'TEXTO_LIBRE'
            ? { palabras: aRegistro(this.palabras) }
            : { respuestas: [...enviadas].map(([preguntaId, opcion]) => ({ preguntaId, opcion })) };
        try {
          const avance = await this.api.registrarRespuestas(
            this.evaluacionId,
            e.subprueba.codigo,
            cuerpo,
          );
          for (const [k, v] of enviadas)
            if (this.pendientes.get(k) === v) this.pendientes.delete(k);
          if (this.palabras.join('\n') === instantanea) this.palabrasPendientes = false;
          this.sincronizar(avance.segundosRestantes);
        } catch (err) {
          if (esCierre(err)) {
            this.entrarEnCierre(e.subprueba);
            return;
          }
          this.marcarGuardado('error');
          return;
        }
      }
      this.marcarGuardado('saved');
    } finally {
      this.guardando = false;
    }
  }

  /** El segundero del servidor manda: cada respuesta reancla el reloj local. */
  private sincronizar(segundos: number | undefined) {
    const e = this.estado;
    if (e.fase === 'ejecucion' && typeof segundos === 'number') {
      this.fijar({ ...e, finMs: this.ahora() + segundos * 1000 });
    }
  }

  // --- Tiempo y cierre ---------------------------------------------------------------------

  /** Se llama una vez por segundo desde la vista. */
  tick = () => {
    const e = this.estado;
    if (e.fase === 'ejecucion' && this.ahora() >= e.finMs) this.entrarEnCierre(e.subprueba);
    else if (
      e.fase === 'transicion' &&
      e.cerrando &&
      this.ahora() - this.ultimoSondeo >= this.intervaloSondeoMs
    ) {
      void this.sondear();
    }
  };

  private entrarEnCierre(config: SubpruebaConfig) {
    const e = this.estado;
    this.ejecucionPrevia = e.fase === 'ejecucion' ? e : null;
    if (this.temporizadorGuardado) clearTimeout(this.temporizadorGuardado);
    this.temporizadorGuardado = null;
    this.fijar({
      fase: 'transicion',
      cerrada: config,
      siguiente: null,
      ...this.posicionDe(config.codigo),
      cerrando: true,
    });
    this.ultimoSondeo = 0;
    this.intentosSondeo = 0;
    void this.sondear();
  }

  /** Pregunta al servidor si ya cerró la subprueba (E4) y recién entonces permite continuar. */
  private async sondear() {
    if (this.sondeando) return;
    this.sondeando = true;
    this.ultimoSondeo = this.ahora();
    this.intentosSondeo += 1;
    try {
      const evaluacion = await this.api.obtenerEvaluacion(this.evaluacionId);
      this.evaluacion = evaluacion;
      const e = this.estado;
      if (e.fase !== 'transicion' || !e.cerrando) return;
      const activa = evaluacion.subpruebas.find((s) => s.estado === 'ACTIVA');
      if (activa?.codigo === e.cerrada.codigo) {
        const segundos = evaluacion.subpruebaActiva?.segundosRestantes ?? 0;
        if (segundos > 0 && this.ejecucionPrevia) {
          this.fijar({ ...this.ejecucionPrevia, finMs: this.ahora() + segundos * 1000 });
        } else if (this.intentosSondeo >= MAX_SONDEOS) {
          this.fallar(new Error('CIERRE_NO_CONFIRMADO'));
        }
        return;
      }
      const pendiente = evaluacion.subpruebas.find((s) => s.estado === 'PENDIENTE');
      this.fijar({
        ...e,
        siguiente: pendiente ? this.config(pendiente.codigo) : null,
        cerrando: false,
      });
    } catch (err) {
      if (this.intentosSondeo >= MAX_SONDEOS) this.fallar(err);
    } finally {
      this.sondeando = false;
    }
  }

  // --- Finalización -------------------------------------------------------------------------

  private async finalizar() {
    this.fijar({ fase: 'listaParaFinalizar', finalizando: true });
    try {
      await this.resolver(await this.api.finalizarEvaluacion(this.evaluacionId));
    } catch (e) {
      this.fallar(e);
    }
  }
}
