import { useEffect, useState } from 'react';
import { EstadoCarga } from '../evaluacion/componentes/EstadoCarga';
import { MensajeError } from '../evaluacion/componentes/MensajeError';
import { aErrorMostrable } from '../evaluacion/mensajesError';
import type { ErrorMostrable, TestDetalleResponse, TestResumenResponse } from '../evaluacion/tipos';
import { ResultadoEnvio } from './componentes';
import { clienteAdministracion as cliente } from './cliente';
import {
  PasoClaveBaremo,
  PasoConfiguracion,
  PasoPreguntas,
  PasoPublicar,
  type ContextoPaso,
  type PreguntaSesion,
} from './pasos';
import type { VersionFormularioResponse } from './tipos';
import { useEnvio } from './useEnvio';
import '../evaluacion/evaluacion.css';
import './administracion.css';

const PASOS = [
  { titulo: 'Versiones', Componente: null },
  { titulo: 'Subpruebas', Componente: PasoConfiguracion },
  { titulo: 'Preguntas y opciones', Componente: PasoPreguntas },
  { titulo: 'Clave y baremos', Componente: PasoClaveBaremo },
  { titulo: 'Publicar', Componente: PasoPublicar },
] as const;

/**
 * GEN-07-FE — Administración de una versión de formulario (Coordinador).
 * Ruta: /administracion
 */
export function AdministracionPagina() {
  const [tests, setTests] = useState<TestResumenResponse[]>();
  const [errorCarga, setErrorCarga] = useState<ErrorMostrable>();
  const [testId, setTestId] = useState<number>();
  const [detalle, setDetalle] = useState<TestDetalleResponse | null>(null);
  const [versiones, setVersiones] = useState<VersionFormularioResponse[]>([]);
  const [versionId, setVersionId] = useState<number>();
  const [preguntas, setPreguntas] = useState<PreguntaSesion[]>([]);
  const [paso, setPaso] = useState(0);
  const creacion = useEnvio();

  useEffect(() => {
    cliente.listarTests().then(setTests, (e: unknown) => setErrorCarga(aErrorMostrable(e)));
  }, []);

  const elegirTest = (id: number) => {
    setTestId(id);
    setDetalle(null);
    setVersionId(undefined);
    setPaso(0);
    // Sin edición publicada E2 responde 404: el test se administra sin subpruebas base.
    cliente.obtenerTest(id).then(
      (d) => {
        setDetalle(d);
        setVersiones((previas) =>
          previas.some((v) => v.id === d.versionFormularioId)
            ? previas
            : [...previas, { id: d.versionFormularioId, testId: id, estado: 'PUBLICADA' }],
        );
      },
      () => setDetalle(null),
    );
  };

  const crearBorrador = () =>
    creacion.enviar(async () => {
      const v = await cliente.crearVersion(testId!);
      setVersiones((previas) => [...previas, v]);
      setVersionId(v.id);
      return `Borrador ${v.id} creado.`;
    });

  const alPublicar = (v: VersionFormularioResponse) =>
    setVersiones((previas) =>
      previas.map((o) =>
        o.id === v.id
          ? v
          : o.testId === v.testId && o.estado === 'PUBLICADA'
            ? { ...o, estado: 'RETIRADA' }
            : o,
      ),
    );

  const version = versiones.find((v) => v.id === versionId);
  const contexto: ContextoPaso | null = version
    ? {
        cliente,
        version,
        subpruebas: detalle?.subpruebas ?? [],
        preguntas,
        setPreguntas,
        onPublicada: alPublicar,
      }
    : null;
  const Actual = PASOS[paso]?.Componente;

  return (
    <div className="ev-pagina">
      <header className="ev-pagina-cabecera">
        <h1>Administración de versiones</h1>
        <p>Cree un borrador, configúrelo paso a paso y publíquelo.</p>
      </header>
      {errorCarga && <MensajeError error={errorCarga} />}
      {!tests && !errorCarga && <EstadoCarga texto="Cargando tests…" />}
      {tests && (
        <section className="ev-panel" aria-label="Tests">
          <h2>Tests</h2>
          <ul className="adm-lista">
            {tests.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="ev-boton ev-boton--secundario"
                  aria-pressed={testId === t.id}
                  onClick={() => elegirTest(t.id)}
                >
                  {t.codigo} · {t.nombre}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {testId !== undefined && (
        <>
          <nav className="ev-pestanas" aria-label="Pasos">
            {PASOS.map((p, i) => (
              <button
                key={p.titulo}
                type="button"
                className="ev-pestana"
                role="tab"
                aria-selected={paso === i}
                disabled={i > 0 && !version}
                onClick={() => setPaso(i)}
              >
                {i + 1}. {p.titulo}
              </button>
            ))}
          </nav>
          <section className="ev-panel">
            {paso === 0 && (
              <>
                <h2>Versiones del test</h2>
                <table className="ev-tabla">
                  <thead>
                    <tr>
                      <th>Versión</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versiones
                      .filter((v) => v.testId === testId)
                      .map((v) => (
                        <tr key={v.id}>
                          <td>{v.id}</td>
                          <td>{v.estado}</td>
                          <td>
                            <button
                              type="button"
                              className="ev-boton ev-boton--secundario"
                              aria-pressed={versionId === v.id}
                              onClick={() => {
                                setVersionId(v.id);
                                setPaso(1);
                              }}
                            >
                              Administrar
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="ev-acciones">
                  <button
                    type="button"
                    className="ev-boton"
                    disabled={creacion.estado.pendiente}
                    onClick={() => void crearBorrador()}
                  >
                    Crear borrador
                  </button>
                </div>
                <ResultadoEnvio estado={creacion.estado} />
              </>
            )}
            {paso > 0 && contexto && Actual && (
              <>
                <h2>
                  {PASOS[paso]?.titulo} · versión {contexto.version.id} ({contexto.version.estado})
                </h2>
                <Actual {...contexto} />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
