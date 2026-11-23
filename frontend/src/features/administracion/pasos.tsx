import { useState, type FormEvent } from 'react';
import type { ConfiguracionSubprueba } from '../evaluacion/tipos';
import { Campo, CajaJson, ErroresCliente, ResultadoEnvio } from './componentes';
import type {
  ClienteAdministracion,
  OpcionRespuesta,
  PreguntaResponse,
  VersionFormularioResponse,
} from './tipos';
import { useEnvio } from './useEnvio';
import {
  analizarOpciones,
  validarBaremo,
  validarClave,
  validarConfiguracion,
  validarOpciones,
  validarPregunta,
} from './validaciones';

/** Pregunta creada en esta sesión (el contrato no tiene un endpoint para listarlas). */
export interface PreguntaSesion extends PreguntaResponse {
  versionId: number;
  codigo: string;
  opciones: OpcionRespuesta[];
}

export interface ContextoPaso {
  cliente: ClienteAdministracion;
  version: VersionFormularioResponse;
  subpruebas: ConfiguracionSubprueba[];
  preguntas: PreguntaSesion[];
  setPreguntas: (actualizar: (previas: PreguntaSesion[]) => PreguntaSesion[]) => void;
  onPublicada: (version: VersionFormularioResponse) => void;
}

const sinEntero = (texto: string) => (texto.trim() === '' ? null : Number(texto));

function SelectorSubprueba({
  subpruebas,
  valor,
  onCambio,
}: {
  subpruebas: ConfiguracionSubprueba[];
  valor: string;
  onCambio: (codigo: string) => void;
}) {
  return (
    <Campo etiqueta="Subprueba">
      {(id) => (
        <select
          id={id}
          className="ev-input"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
        >
          {subpruebas.map((s) => (
            <option key={s.codigo} value={s.codigo}>
              {s.codigo} · {s.nombre}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}

const SIN_SUBPRUEBAS = (
  <p className="ev-ayuda">
    Este test no tiene subpruebas en una edición publicada que sirva de base.
  </p>
);

/** Paso 2 — E26: configuración de cada subprueba. */
export function PasoConfiguracion({ cliente, version, subpruebas }: ContextoPaso) {
  const [codigo, setCodigo] = useState(subpruebas[0]?.codigo ?? '');
  const base = subpruebas.find((s) => s.codigo === codigo);
  const { estado, enviar } = useEnvio();
  const [errores, setErrores] = useState<ReturnType<typeof validarConfiguracion>>([]);
  const [valores, setValores] = useState({
    orden: String(base?.orden ?? 1),
    tiempo: String(base?.tiempoLimiteSegundos ?? ''),
    tipo: base?.tipoRespuesta ?? 'SELECCION',
    opciones: String(base?.opciones ?? ''),
    maximo: String(base?.maximoEntradas ?? ''),
    practica: base?.tienePractica ?? false,
    instrucciones: `Instrucciones ficticias de ${base?.nombre ?? ''}.`,
  });
  if (!base) return SIN_SUBPRUEBAS;

  const elegir = (nuevo: string) => {
    const s = subpruebas.find((x) => x.codigo === nuevo)!;
    setCodigo(nuevo);
    setValores({
      orden: String(s.orden),
      tiempo: String(s.tiempoLimiteSegundos),
      tipo: s.tipoRespuesta,
      opciones: String(s.opciones ?? ''),
      maximo: String(s.maximoEntradas ?? ''),
      practica: s.tienePractica,
      instrucciones: `Instrucciones ficticias de ${s.nombre}.`,
    });
  };
  const campo = <K extends keyof typeof valores>(k: K, v: (typeof valores)[K]) =>
    setValores((previos) => ({ ...previos, [k]: v }));

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    const solicitud = {
      orden: Number(valores.orden),
      tiempoLimiteSegundos: Number(valores.tiempo),
      tipoRespuesta: valores.tipo,
      opciones: sinEntero(valores.opciones),
      maximoEntradas: sinEntero(valores.maximo),
      tienePractica: valores.practica,
      instrucciones: valores.instrucciones,
    };
    const encontrados = validarConfiguracion(solicitud);
    setErrores(encontrados);
    if (encontrados.length === 0)
      void enviar(async () => {
        await cliente.guardarConfiguracion(version.id, codigo, solicitud);
        return `Configuración de ${codigo} guardada.`;
      });
  };

  return (
    <form className="ev-form" onSubmit={guardar} noValidate>
      <SelectorSubprueba subpruebas={subpruebas} valor={codigo} onCambio={elegir} />
      <Campo etiqueta="Orden de aplicación">
        {(id) => (
          <input
            id={id}
            className="ev-input ev-input--corto"
            inputMode="numeric"
            value={valores.orden}
            onChange={(e) => campo('orden', e.target.value)}
          />
        )}
      </Campo>
      <Campo etiqueta="Tiempo límite (segundos)">
        {(id) => (
          <input
            id={id}
            className="ev-input ev-input--corto"
            inputMode="numeric"
            value={valores.tiempo}
            onChange={(e) => campo('tiempo', e.target.value)}
          />
        )}
      </Campo>
      <Campo etiqueta="Tipo de respuesta">
        {(id) => (
          <select
            id={id}
            className="ev-input"
            value={valores.tipo}
            onChange={(e) => campo('tipo', e.target.value as typeof valores.tipo)}
          >
            <option value="SELECCION">SELECCION</option>
            <option value="TEXTO_LIBRE">TEXTO_LIBRE</option>
          </select>
        )}
      </Campo>
      <Campo etiqueta="Opciones por pregunta (vacío si no aplica)">
        {(id) => (
          <input
            id={id}
            className="ev-input ev-input--corto"
            inputMode="numeric"
            value={valores.opciones}
            onChange={(e) => campo('opciones', e.target.value)}
          />
        )}
      </Campo>
      <Campo etiqueta="Máximo de entradas (vacío si no aplica)">
        {(id) => (
          <input
            id={id}
            className="ev-input ev-input--corto"
            inputMode="numeric"
            value={valores.maximo}
            onChange={(e) => campo('maximo', e.target.value)}
          />
        )}
      </Campo>
      <label>
        <input
          type="checkbox"
          checked={valores.practica}
          onChange={(e) => campo('practica', e.target.checked)}
        />{' '}
        Tiene práctica
      </label>
      <Campo etiqueta="Instrucciones">
        {(id) => (
          <textarea
            id={id}
            className="ev-input"
            rows={3}
            value={valores.instrucciones}
            onChange={(e) => campo('instrucciones', e.target.value)}
          />
        )}
      </Campo>
      <ErroresCliente errores={errores} />
      <div className="ev-acciones">
        <button type="submit" className="ev-boton" disabled={estado.pendiente}>
          Guardar configuración
        </button>
      </div>
      <ResultadoEnvio estado={estado} />
    </form>
  );
}

function OpcionesPregunta({
  pregunta,
  cliente,
  onGuardadas,
}: {
  pregunta: PreguntaSesion;
  cliente: ClienteAdministracion;
  onGuardadas: (id: number, opciones: OpcionRespuesta[]) => void;
}) {
  const [texto, setTexto] = useState('A = Opción ficticia A\nB = Opción ficticia B');
  const [errores, setErrores] = useState<ReturnType<typeof validarOpciones>>([]);
  const { estado, enviar } = useEnvio();
  const guardar = () => {
    const solicitud = { opciones: analizarOpciones(texto) };
    const encontrados = validarOpciones(solicitud);
    setErrores(encontrados);
    if (encontrados.length === 0)
      void enviar(async () => {
        await cliente.guardarOpciones(pregunta.versionId, pregunta.id, solicitud);
        onGuardadas(pregunta.id, solicitud.opciones);
        return 'Opciones guardadas.';
      });
  };
  return (
    <li className="adm-pregunta">
      <strong>
        Pregunta {pregunta.numeroVisible} ({pregunta.codigo}) · id {pregunta.id}
      </strong>
      <p>{pregunta.enunciado}</p>
      <Campo etiqueta="Opciones (una por línea: letra = texto)">
        {(id) => (
          <textarea
            id={id}
            className="ev-input"
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        )}
      </Campo>
      <ErroresCliente errores={errores} />
      <div className="ev-acciones">
        <button
          type="button"
          className="ev-boton ev-boton--secundario"
          disabled={estado.pendiente}
          onClick={guardar}
        >
          Guardar opciones
        </button>
      </div>
      <ResultadoEnvio estado={estado} />
    </li>
  );
}

/** Paso 3 — E27 y E28: preguntas y opciones versionadas. */
export function PasoPreguntas({
  cliente,
  version,
  subpruebas,
  preguntas,
  setPreguntas,
}: ContextoPaso) {
  const [codigo, setCodigo] = useState(subpruebas[0]?.codigo ?? '');
  const [numero, setNumero] = useState('1');
  const [orden, setOrden] = useState('1');
  const [enunciado, setEnunciado] = useState('Pregunta ficticia de ejemplo');
  const [errores, setErrores] = useState<ReturnType<typeof validarPregunta>>([]);
  const { estado, enviar } = useEnvio();
  if (subpruebas.length === 0) return SIN_SUBPRUEBAS;

  const agregar = (e: FormEvent) => {
    e.preventDefault();
    const solicitud = {
      numeroVisible: Number(numero),
      ordenPresentacion: Number(orden),
      enunciado,
    };
    const encontrados = validarPregunta(solicitud);
    setErrores(encontrados);
    if (encontrados.length > 0) return;
    void enviar(async () => {
      const creada = await cliente.agregarPregunta(version.id, codigo, solicitud);
      setPreguntas((previas) => [
        ...previas,
        { ...creada, versionId: version.id, codigo, opciones: [] },
      ]);
      setNumero(String(solicitud.numeroVisible + 1));
      setOrden(String(solicitud.ordenPresentacion + 1));
      return `Pregunta creada con id ${creada.id}. Defina sus opciones abajo.`;
    });
  };
  const propias = preguntas.filter((p) => p.versionId === version.id);

  return (
    <>
      <form className="ev-form" onSubmit={agregar} noValidate>
        <SelectorSubprueba subpruebas={subpruebas} valor={codigo} onCambio={setCodigo} />
        <Campo etiqueta="Número visible">
          {(id) => (
            <input
              id={id}
              className="ev-input ev-input--corto"
              inputMode="numeric"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          )}
        </Campo>
        <Campo etiqueta="Orden de presentación">
          {(id) => (
            <input
              id={id}
              className="ev-input ev-input--corto"
              inputMode="numeric"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            />
          )}
        </Campo>
        <Campo etiqueta="Enunciado">
          {(id) => (
            <textarea
              id={id}
              className="ev-input"
              rows={2}
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
            />
          )}
        </Campo>
        <ErroresCliente errores={errores} />
        <div className="ev-acciones">
          <button type="submit" className="ev-boton" disabled={estado.pendiente}>
            Agregar pregunta
          </button>
        </div>
        <ResultadoEnvio estado={estado} />
      </form>
      {propias.length > 0 && (
        <ul className="adm-lista">
          {propias.map((p) => (
            <OpcionesPregunta
              key={p.id}
              pregunta={p}
              cliente={cliente}
              onGuardadas={(id, opciones) =>
                setPreguntas((previas) =>
                  previas.map((q) => (q.id === id ? { ...q, opciones } : q)),
                )
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

const EJEMPLO_BAREMO = JSON.stringify(
  {
    nombre: 'Baremo ficticio',
    version: '1',
    anioNorma: 2000,
    poblacionReferencia: 'Población ficticia',
    referenciaFuente: 'Fuente ficticia',
    rangos: [
      {
        idFactor: 'VOC1',
        percentil: 10,
        limiteInferior: 0,
        limiteSuperior: 5,
        estadoCelda: 'RANGO',
      },
      {
        idFactor: 'VOC1',
        percentil: 20,
        limiteInferior: 6,
        limiteSuperior: 9,
        estadoCelda: 'RANGO',
      },
      { idFactor: 'VOC1', percentil: 30, estadoCelda: 'SIN_DATO' },
    ],
  },
  null,
  2,
);

/** Paso 4 — E29 y E30: clave y baremos por JSON pegado, validado antes de enviar. */
export function PasoClaveBaremo({ cliente, version, preguntas }: ContextoPaso) {
  const clave = useEnvio();
  const baremo = useEnvio();
  const ejemploClave = JSON.stringify(
    {
      entradas: preguntas
        .filter((p) => p.versionId === version.id)
        .map((p) => ({ preguntaId: p.id, opcion: p.opciones[0]?.letra ?? 'A' })),
    },
    null,
    2,
  );
  return (
    <>
      <h3>Clave de respuestas (E29)</h3>
      <p className="ev-ayuda">
        Una entrada por pregunta cerrada; la letra debe pertenecer a las opciones de esa pregunta.
      </p>
      <CajaJson
        titulo="JSON de la clave"
        ejemplo={ejemploClave}
        validar={validarClave}
        deshabilitado={clave.estado.pendiente}
        onEnviar={(valor) =>
          void clave.enviar(async () => {
            const r = await cliente.cargarClave(
              version.id,
              valor as Parameters<typeof cliente.cargarClave>[1],
            );
            return `Clave cargada (id ${r.idClave}).`;
          })
        }
      />
      <ResultadoEnvio estado={clave.estado} />
      <h3>Baremo (E30)</h3>
      <p className="ev-ayuda">El baremo no depende de la versión. Use solo valores ficticios.</p>
      <CajaJson
        titulo="JSON del baremo"
        ejemplo={EJEMPLO_BAREMO}
        validar={validarBaremo}
        deshabilitado={baremo.estado.pendiente}
        onEnviar={(valor) =>
          void baremo.enviar(async () => {
            const r = await cliente.cargarBaremo(
              valor as Parameters<typeof cliente.cargarBaremo>[0],
            );
            return `Baremo cargado (id ${r.idBaremo}).`;
          })
        }
      />
      <ResultadoEnvio estado={baremo.estado} />
    </>
  );
}

/** Paso 5 — E31: publicar; los errores de precondición del contrato se muestran tal cual. */
export function PasoPublicar({ cliente, version, onPublicada }: ContextoPaso) {
  const { estado, enviar } = useEnvio();
  return (
    <>
      <p>
        Publicar la versión {version.id} la deja disponible para nuevas evaluaciones. Debe tener
        contenido, instrucciones y la clave de cada pregunta cerrada.
      </p>
      <div className="ev-acciones">
        <button
          type="button"
          className="ev-boton"
          disabled={estado.pendiente || version.estado !== 'BORRADOR'}
          onClick={() =>
            void enviar(async () => {
              const publicada = await cliente.publicar(version.id);
              onPublicada(publicada);
              return `Versión ${publicada.id} publicada.`;
            })
          }
        >
          Publicar
        </button>
      </div>
      <ResultadoEnvio estado={estado} />
    </>
  );
}
