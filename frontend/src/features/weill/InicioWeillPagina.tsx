import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { clienteWeill } from './cliente';
import { contarRespondidos } from './items';
import { mensajeError } from './mensajes';
import { TOTAL_ITEMS, type IntentoWeill } from './tipos';
import './weill.css';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; enCurso: IntentoWeill | null }
  | { fase: 'error'; mensaje: string };

/** WEI-FE-02 — iniciar un intento o retomar el EN_CURSO. Ruta: /weill */
export function InicioWeillPagina() {
  const navegar = useNavigate();
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [iniciando, setIniciando] = useState(false);
  const [errorInicio, setErrorInicio] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setEstado({ fase: 'cargando' });
    clienteWeill
      .obtenerIntentoEnCurso()
      .then((enCurso) => setEstado({ fase: 'listo', enCurso }))
      .catch((e: unknown) => setEstado({ fase: 'error', mensaje: mensajeError(e) }));
  }, []);

  useEffect(cargar, [cargar]);

  const abrir = (intento: IntentoWeill) => void navegar(`/weill/intentos/${intento.id}`);

  const iniciar = async () => {
    setIniciando(true);
    setErrorInicio(null);
    try {
      abrir(await clienteWeill.iniciarIntento());
    } catch (e) {
      setErrorInicio(mensajeError(e));
      setIniciando(false);
    }
  };

  return (
    <section className="test-paper weill-panel" aria-labelledby="weill-inicio-titulo">
      <header className="test-header">
        <span className="test-name">Prueba No Verbal · Forma A</span>
      </header>
      <div className="test-content">
        <h1 className="question-prompt" id="weill-inicio-titulo">
          Inteligencia de Weill
        </h1>

        <section className="weill-marcador" aria-labelledby="weill-instrucciones">
          <p className="phase-label">Instrucciones</p>
          <h2 id="weill-instrucciones">Instrucciones pendientes de aprobación</h2>
          <p className="phase-description">
            Marcador provisional (H-10): el texto oficial de instrucciones y la práctica se
            agregarán cuando se aprueben.
          </p>
        </section>

        {estado.fase === 'cargando' && <p role="status">Buscando un intento en curso…</p>}

        {estado.fase === 'error' && (
          <div className="weill-error" role="alert">
            <p>{estado.mensaje}</p>
            <button className="secondary-action" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        )}

        {estado.fase === 'listo' && estado.enCurso && (
          <div className="weill-acciones">
            <p>
              Tiene un intento en curso con {contarRespondidos(estado.enCurso.respuestas)} de{' '}
              {TOTAL_ITEMS} ítems respondidos. Sus respuestas se conservan.
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={() => estado.enCurso && abrir(estado.enCurso)}
            >
              Retomar intento
            </button>
          </div>
        )}

        {estado.fase === 'listo' && !estado.enCurso && (
          <div className="weill-acciones">
            <p>
              {TOTAL_ITEMS} ítems en 5 láminas. Sin límite de tiempo. Puede dejar ítems sin
              responder.
            </p>
            <button
              className="primary-action"
              type="button"
              disabled={iniciando}
              onClick={() => void iniciar()}
            >
              {iniciando ? 'Iniciando…' : 'Iniciar prueba'}
            </button>
            {errorInicio && (
              <p className="weill-error" role="alert">
                {errorInicio}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
