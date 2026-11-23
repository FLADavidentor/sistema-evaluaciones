import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { clienteWeill } from './cliente';
import { mensajeError } from './mensajes';
import { ETIQUETAS_ESTADO, filasResultado, mostrar } from './resultado';
import type { ResultadoWeill } from './tipos';
import './weill.css';

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; resultado: ResultadoWeill };

/** WEI-FE-05 — resultado para el psicólogo (solo estructura; el cliente no califica). */
export function ResultadoWeillPagina() {
  const intentoId = Number(useParams().intentoId);
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });

  const cargar = useCallback(() => {
    setCarga({ fase: 'cargando' });
    clienteWeill
      .obtenerResultado(intentoId)
      .then((resultado) => setCarga({ fase: 'listo', resultado }))
      .catch((e: unknown) => setCarga({ fase: 'error', mensaje: mensajeError(e) }));
  }, [intentoId]);

  useEffect(cargar, [cargar]);

  return (
    <section className="test-paper weill-panel" aria-labelledby="weill-resultado-titulo">
      <header className="test-header">
        <span className="test-name">Prueba No Verbal · Forma A · Intento {intentoId}</span>
      </header>
      <div className="test-content">
        <h1 className="question-prompt" id="weill-resultado-titulo">
          Resultado de Weill
        </h1>
        <p className="weill-marcador" role="note">
          Este resultado no sustituye el criterio profesional del psicólogo.
        </p>
        {carga.fase === 'cargando' && <p role="status">Cargando el resultado…</p>}
        {carga.fase === 'error' && (
          <div className="weill-error" role="alert">
            <p>{carga.mensaje}</p>
            <button className="secondary-action" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        )}
        {carga.fase === 'listo' && (
          <>
            <p>
              Estado: <strong>{ETIQUETAS_ESTADO[carga.resultado.estado]}</strong>
            </p>
            <table className="weill-tabla">
              <caption className="visually-hidden">Puntajes del intento {intentoId}</caption>
              <tbody>
                {filasResultado(carga.resultado).map(([nombre, valor]) => (
                  <tr key={nombre}>
                    <th scope="row">{nombre}</th>
                    <td className={valor === mostrar(null) ? 'weill-sin-valor' : undefined}>
                      {valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
