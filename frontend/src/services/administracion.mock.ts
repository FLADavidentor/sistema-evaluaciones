import type {
  BaremoRequest,
  ClaveRequest,
  ClienteAdministracion,
  ConfiguracionSubpruebaRequest,
  EstadoVersion,
  OpcionesRequest,
  OpcionRespuesta,
  PreguntaRequest,
  PreguntaResponse,
  VersionFormularioResponse,
} from '../features/administracion/tipos';
import {
  validarBaremo,
  validarClave,
  validarConfiguracion,
  validarOpciones,
  validarPregunta,
} from '../features/administracion/validaciones';
import type { DetalleCampo } from '../features/evaluacion/tipos';
import { crearCatalogoMock } from './catalogo.mock';
import { TEST_BFA, escenarioPorId, fallar } from './evaluacion.mock';

/**
 * Simulación de E1, E2 y E25–E31 con datos ficticios (ningún reactivo, clave ni norma reales).
 *
 * Estado en memoria:
 *   Versión 10 (test 1, BFA) → PUBLICADA, con contenido ficticio completo.
 *   E25 en test 1            → borrador copiado de la última publicada (se puede publicar enseguida).
 *   E25 en test 2            → borrador vacío: E31 responde 422 VERSION_INCOMPLETA.
 *   Versión ya publicada     → E26–E29 y E31 responden 409 VERSION_NO_EDITABLE.
 *   Id 403 / 500 / 503       → SIN_PERMISO / ERROR_INTERNO / fallo de conexión.
 */

interface PreguntaGuardada extends PreguntaResponse {
  codigo: string;
  opciones: OpcionRespuesta[];
}

interface VersionGuardada {
  id: number;
  testId: number;
  estado: EstadoVersion;
  configuraciones: Map<string, ConfiguracionSubpruebaRequest>;
  preguntas: PreguntaGuardada[];
  clave: Map<number, string>;
}

export interface OpcionesAdministracionMock {
  /** Retardo artificial en ms (0 en pruebas). */
  retardoMs?: number;
}

const VERSION_PUBLICADA = 10;

const vista = ({ id, testId, estado }: VersionGuardada): VersionFormularioResponse => ({
  id,
  testId,
  estado,
});

export function crearAdministracionMock({
  retardoMs = 500,
}: OpcionesAdministracionMock = {}): ClienteAdministracion {
  const catalogo = crearCatalogoMock({ retardoMs });
  const esperar = () => new Promise<void>((resolver) => setTimeout(resolver, retardoMs));
  const versiones = new Map<number, VersionGuardada>();
  let siguienteVersion = VERSION_PUBLICADA + 1;
  let siguientePregunta = 100;
  let siguienteClave = 4;
  let siguienteBaremo = 2;

  const nueva = (testId: number, estado: EstadoVersion, id: number): VersionGuardada => {
    const v: VersionGuardada = {
      id,
      testId,
      estado,
      configuraciones: new Map(),
      preguntas: [],
      clave: new Map(),
    };
    versiones.set(id, v);
    return v;
  };

  // Contenido ficticio de la versión publicada: una pregunta A/B por subprueba, clave A.
  const publicada = nueva(TEST_BFA.id, 'PUBLICADA', VERSION_PUBLICADA);
  for (const s of TEST_BFA.subpruebas) {
    publicada.configuraciones.set(s.codigo, {
      orden: s.orden,
      tiempoLimiteSegundos: s.tiempoLimiteSegundos,
      tipoRespuesta: s.tipoRespuesta,
      opciones: s.opciones,
      maximoEntradas: s.maximoEntradas,
      tienePractica: s.tienePractica,
      instrucciones: `Instrucciones ficticias de ${s.nombre}.`,
    });
    const id = siguientePregunta++;
    publicada.preguntas.push({
      id,
      codigo: s.codigo,
      numeroVisible: 1,
      ordenPresentacion: 1,
      enunciado: `Pregunta ficticia de ${s.codigo}`,
      opciones: [
        { letra: 'A', texto: 'Opción ficticia A' },
        { letra: 'B', texto: 'Opción ficticia B' },
      ],
    });
    publicada.clave.set(id, 'A');
  }

  const obtener = (versionId: number, ruta: string): VersionGuardada => {
    escenarioPorId(versionId, ruta);
    const v = versiones.get(versionId);
    if (!v) fallar(404, 'VERSION_NO_ENCONTRADA', 'La versión no existe.', ruta);
    return v;
  };

  const editable = (versionId: number, ruta: string): VersionGuardada => {
    const v = obtener(versionId, ruta);
    if (v.estado !== 'BORRADOR')
      fallar(409, 'VERSION_NO_EDITABLE', 'La versión no está en BORRADOR.', ruta);
    return v;
  };

  const validar = (detalles: DetalleCampo[], ruta: string) => {
    if (detalles.length > 0)
      fallar(400, 'SOLICITUD_INVALIDA', 'La solicitud no es válida.', ruta, detalles);
  };

  const codigosDe = (testId: number) =>
    testId === TEST_BFA.id ? TEST_BFA.subpruebas.map((s) => s.codigo) : [];

  const faltantes = (v: VersionGuardada): string[] => {
    const f: string[] = [];
    const codigos = codigosDe(v.testId);
    if (codigos.length === 0) f.push('el test no tiene subpruebas configuradas');
    for (const codigo of codigos) {
      const c = v.configuraciones.get(codigo);
      if (!c) f.push(`${codigo}: sin configuración`);
      else if (!c.instrucciones?.trim()) f.push(`${codigo}: sin instrucciones`);
      const propias = v.preguntas.filter((p) => p.codigo === codigo);
      if (c && c.tipoRespuesta !== 'TEXTO_LIBRE' && propias.length === 0)
        f.push(`${codigo}: sin preguntas`);
      for (const p of propias) {
        if (p.opciones.length === 0 && c?.tipoRespuesta !== 'TEXTO_LIBRE')
          f.push(`${codigo} pregunta ${p.numeroVisible}: sin opciones`);
        else if (c?.tipoRespuesta !== 'TEXTO_LIBRE' && !v.clave.has(p.id))
          f.push(`${codigo} pregunta ${p.numeroVisible}: sin clave`);
      }
    }
    return f;
  };

  return {
    listarTests: () => catalogo.listarTests(),
    obtenerTest: (testId) => catalogo.obtenerTest(testId),

    async crearVersion(testId) {
      await esperar();
      const ruta = `/api/v1/tests/${testId}/versiones`;
      escenarioPorId(testId, ruta);
      if (testId !== 1 && testId !== 2)
        fallar(404, 'TEST_NO_ENCONTRADO', 'El test no existe.', ruta);
      const v = nueva(testId, 'BORRADOR', siguienteVersion++);
      if (testId === TEST_BFA.id) {
        // Copia el contenido de la última publicada con ids nuevos.
        const ids = new Map<number, number>();
        publicada.configuraciones.forEach((c, k) => v.configuraciones.set(k, structuredClone(c)));
        for (const p of publicada.preguntas) {
          const copia = { ...structuredClone(p), id: siguientePregunta++ };
          ids.set(p.id, copia.id);
          v.preguntas.push(copia);
        }
        publicada.clave.forEach((letra, id) => v.clave.set(ids.get(id)!, letra));
      }
      return vista(v);
    },

    async guardarConfiguracion(versionId, codigo, solicitud) {
      await esperar();
      const ruta = `/api/v1/versiones/${versionId}/configuraciones/${codigo}`;
      const v = editable(versionId, ruta);
      const detalles = validarConfiguracion(solicitud);
      if (!codigosDe(v.testId).includes(codigo))
        detalles.push({ campo: 'codigo', mensaje: 'la subprueba no pertenece al test' });
      validar(detalles, ruta);
      v.configuraciones.set(codigo, structuredClone(solicitud));
      return structuredClone(solicitud);
    },

    async agregarPregunta(versionId, codigo, solicitud: PreguntaRequest) {
      await esperar();
      const ruta = `/api/v1/versiones/${versionId}/configuraciones/${codigo}/preguntas`;
      const v = editable(versionId, ruta);
      validar(validarPregunta(solicitud), ruta);
      if (!v.configuraciones.has(codigo))
        validar([{ campo: 'codigo', mensaje: 'la subprueba aún no tiene configuración' }], ruta);
      const propias = v.preguntas.filter((p) => p.codigo === codigo);
      if (
        propias.some(
          (p) =>
            p.numeroVisible === solicitud.numeroVisible ||
            p.ordenPresentacion === solicitud.ordenPresentacion,
        )
      )
        fallar(422, 'PREGUNTA_DUPLICADA', 'El número o el orden ya está en uso.', ruta);
      const pregunta: PreguntaGuardada = {
        ...structuredClone(solicitud),
        id: siguientePregunta++,
        codigo,
        opciones: [],
      };
      v.preguntas.push(pregunta);
      const { id, numeroVisible, ordenPresentacion, enunciado, recursoRef } = pregunta;
      return { id, numeroVisible, ordenPresentacion, enunciado, recursoRef };
    },

    async guardarOpciones(versionId, preguntaId, solicitud: OpcionesRequest) {
      await esperar();
      const ruta = `/api/v1/versiones/${versionId}/preguntas/${preguntaId}/opciones`;
      const v = editable(versionId, ruta);
      validar(validarOpciones(solicitud), ruta);
      const pregunta = v.preguntas.find((p) => p.id === preguntaId);
      if (!pregunta) fallar(404, 'PREGUNTA_NO_ENCONTRADA', 'La pregunta no existe.', ruta);
      pregunta.opciones = structuredClone(solicitud.opciones);
      // Una clave que ya no corresponde a ninguna letra se descarta.
      const letra = v.clave.get(preguntaId);
      if (letra && !pregunta.opciones.some((o) => o.letra === letra)) v.clave.delete(preguntaId);
      return structuredClone(solicitud);
    },

    async cargarClave(versionId, solicitud: ClaveRequest) {
      await esperar();
      const ruta = `/api/v1/versiones/${versionId}/clave`;
      const v = editable(versionId, ruta);
      validar(validarClave(solicitud), ruta);
      for (const e of solicitud.entradas) {
        const p = v.preguntas.find((q) => q.id === e.preguntaId);
        if (!p)
          fallar(404, 'PREGUNTA_NO_ENCONTRADA', `La pregunta ${e.preguntaId} no existe.`, ruta);
        if (!p.opciones.some((o) => o.letra === e.opcion))
          fallar(
            422,
            'OPCION_NO_PERTENECE',
            `La opción ${e.opcion} no pertenece a la pregunta ${e.preguntaId}.`,
            ruta,
          );
      }
      v.clave = new Map(solicitud.entradas.map((e) => [e.preguntaId, e.opcion]));
      return { idClave: siguienteClave++ };
    },

    async cargarBaremo(solicitud: BaremoRequest) {
      await esperar();
      const ruta = '/api/v1/baremos';
      validar(validarBaremo(solicitud), ruta);
      const rangos = solicitud.rangos.filter((r) => r.estadoCelda === 'RANGO');
      const solapa = rangos.some((a, i) =>
        rangos.some(
          (b, j) =>
            j > i &&
            a.idFactor === b.idFactor &&
            (a.percentil === b.percentil ||
              (a.limiteInferior! <= (b.limiteSuperior ?? b.limiteInferior!) &&
                b.limiteInferior! <= (a.limiteSuperior ?? a.limiteInferior!))),
        ),
      );
      if (solapa)
        fallar(422, 'BAREMO_INVALIDO', 'Hay rangos superpuestos en un mismo factor.', ruta);
      return { idBaremo: siguienteBaremo++ };
    },

    async publicar(versionId) {
      await esperar();
      const ruta = `/api/v1/versiones/${versionId}/publicar`;
      const v = editable(versionId, ruta);
      const f = faltantes(v);
      if (f.length > 0)
        fallar(422, 'VERSION_INCOMPLETA', `La versión está incompleta: ${f.join('; ')}.`, ruta);
      versiones.forEach((o) => {
        if (o.testId === v.testId && o.estado === 'PUBLICADA') o.estado = 'RETIRADA';
      });
      v.estado = 'PUBLICADA';
      return vista(v);
    },
  };
}
