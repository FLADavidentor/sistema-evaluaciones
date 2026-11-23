import { useEffect, useState } from 'react';

import { ApiError } from '../../../services/http';
import { listarTests, obtenerTest } from '../services/catalogoService';

import type { TestResumenResponse, TestDetalleResponse } from '../types/catalogo.types';

function obtenerMensajeError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.message} (HTTP ${error.status})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado al consultar el catálogo.';
}

export function CatalogoPage() {
  const [tests, setTests] = useState<TestResumenResponse[]>([]);
  const [testSeleccionado, setTestSeleccionado] = useState<TestDetalleResponse | null>(null);

  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const [testIdSeleccionado, setTestIdSeleccionado] = useState<number | null>(null);

  // Consulta inicial del catálogo.
  useEffect(() => {
    let activo = true;

    async function cargarCatalogo() {
      try {
        setCargando(true);
        setError(null);

        const resultado = await listarTests();

        if (activo) {
          setTests(resultado);
        }
      } catch (err) {
        if (activo) {
          setError(obtenerMensajeError(err));
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarCatalogo();

    return () => {
      activo = false;
    };
  }, []);

  // Consulta del detalle cuando se selecciona un test.
  useEffect(() => {
    if (testIdSeleccionado === null) {
      setTestSeleccionado(null);
      setErrorDetalle(null);
      return;
    }

    const testId = testIdSeleccionado;

    let activo = true;

    async function cargarDetalle() {
      try {
        setCargandoDetalle(true);
        setErrorDetalle(null);
        setTestSeleccionado(null);

        const resultado = await obtenerTest(testId);

        if (activo) {
          setTestSeleccionado(resultado);
        }
      } catch (err) {
        if (activo) {
          setErrorDetalle(obtenerMensajeError(err));
        }
      } finally {
        if (activo) {
          setCargandoDetalle(false);
        }
      }
    }

    void cargarDetalle();

    return () => {
      activo = false;
    };
  }, [testIdSeleccionado]);

  return (
    <section className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="catalog-eyebrow">Sistema de evaluaciones</p>
          <h1>Catálogo de tests</h1>
          <p>Consulta los instrumentos de evaluación disponibles y sus configuraciones.</p>
        </div>

        <span className="catalog-count">{tests.length} tests disponibles</span>
      </header>

      {cargando && (
        <p className="catalog-message" role="status">
          Cargando catálogo...
        </p>
      )}

      {error && (
        <div className="catalog-error" role="alert">
          <strong>No fue posible cargar el catálogo.</strong>
          <p>{error}</p>
        </div>
      )}

      {!cargando && !error && tests.length === 0 && (
        <p className="catalog-message">No hay tests activos disponibles.</p>
      )}

      {!cargando && !error && tests.length > 0 && (
        <section className="catalog-layout">
          <div className="catalog-list">
            <h2>Tests disponibles</h2>

            {tests.map((test, index) => (
              <button
                key={test.id ?? `${test.codigo}-${index}`}
                type="button"
                className={`catalog-card ${
                  testIdSeleccionado === test.id ? 'catalog-card--selected' : ''
                }`}
                onClick={() => {
                  if (test.id !== undefined) {
                    setTestIdSeleccionado(test.id);
                  }
                }}
                disabled={test.id === undefined}
                aria-pressed={testIdSeleccionado === test.id}
              >
                <span className="catalog-card-code">{test.codigo ?? 'Sin código'}</span>

                <strong>{test.nombre ?? 'Test sin nombre'}</strong>

                <span className="catalog-card-meta">{test.numeroSubpruebas ?? 0} subpruebas</span>
              </button>
            ))}
          </div>

          <section className="catalog-detail">
            <h2>Detalle del test</h2>

            {testIdSeleccionado === null && (
              <p className="catalog-message">Selecciona un test para consultar sus subpruebas.</p>
            )}

            {cargandoDetalle && (
              <p className="catalog-message" role="status">
                Consultando información del test...
              </p>
            )}

            {errorDetalle && (
              <div className="catalog-error" role="alert">
                <strong>No fue posible consultar el detalle.</strong>
                <p>{errorDetalle}</p>
              </div>
            )}

            {testSeleccionado && !cargandoDetalle && (
              <article>
                <p className="catalog-detail-code">{testSeleccionado.codigo}</p>

                <h3>{testSeleccionado.nombre}</h3>

                <p className="catalog-detail-meta">
                  Versión de formulario: {testSeleccionado.versionFormularioId ?? 'No disponible'}
                </p>

                <h3>Subpruebas</h3>

                {testSeleccionado.subpruebas?.length ? (
                  <ul className="catalog-subtests">
                    {testSeleccionado.subpruebas.map((subprueba, index) => (
                      <li key={`${subprueba.codigo ?? 'subprueba'}-${index}`}>
                        <strong>{subprueba.nombre ?? 'Sin nombre'}</strong>

                        <span>Código: {subprueba.codigo ?? 'N/D'}</span>

                        <span>Factor: {subprueba.factor ?? 'N/D'}</span>

                        <span>Tipo de respuesta: {subprueba.tipoRespuesta ?? 'N/D'}</span>

                        <span>Número de preguntas: {subprueba.numeroPreguntas ?? 'N/D'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="catalog-message">Este test no tiene subpruebas registradas.</p>
                )}
              </article>
            )}
          </section>
        </section>
      )}
    </section>
  );
}
