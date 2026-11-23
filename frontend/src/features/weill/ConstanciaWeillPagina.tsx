import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { clienteWeill } from './cliente';
import { mensajeError } from './mensajes';
import { TOTAL_ITEMS, type ConstanciaWeill } from './tipos';
import './weill.css';

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; constancia: ConstanciaWeill };

/** WEI-FE-04 — constancia de finalización, sin puntaje. Ruta: /weill/intentos/:id/constancia */
export function ConstanciaWeillPagina() {
  const intentoId = Number(useParams().intentoId);
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });

  const cargar = useCallback(() => {
    setCarga({ fase: 'cargando' });
    clienteWeill
      .obtenerConstancia(intentoId)
      .then((constancia) => setCarga({ fase: 'listo', constancia }))
      .catch((e: unknown) => setCarga({ fase: 'error', mensaje: mensajeError(e) }));
  }, [intentoId]);

  useEffect(cargar, [cargar]);

  return (
    <section className="test-paper weill-panel" aria-labelledby="weill-constancia-titulo">
      <header className="test-header">
        <span className="test-name">Prueba No Verbal · Forma A</span>
      </header>
      <div className="test-content">
        <h1 className="question-prompt" id="weill-constancia-titulo">
          Constancia de finalización
        </h1>
        {carga.fase === 'cargando' && <p role="status">Cargando la constancia…</p>}
        {carga.fase === 'error' && (
          <div className="weill-error" role="alert">
            <p>{carga.mensaje}</p>
            <button className="secondary-action" type="button" onClick={cargar}>
              Reintentar
            </button>
          </div>
        )}
        {carga.fase === 'listo' && (
          <div className="weill-acciones">
            <dl className="weill-datos">
              <dt>Intento</dt>
              <dd>{carga.constancia.intentoId}</dd>
              <dt>Finalizado</dt>
              <dd>{formatoFecha(carga.constancia.fechaFin)}</dd>
              <dt>Ítems respondidos</dt>
              <dd>
                {carga.constancia.respondidos} de {TOTAL_ITEMS}
              </dd>
              <dt>Ítems omitidos</dt>
              <dd>{carga.constancia.omitidos}</dd>
            </dl>
            <p>
              Sus respuestas quedaron registradas y ya no pueden modificarse. El resultado lo revisa
              el psicólogo responsable.
            </p>
            <Link to="/weill">Volver al inicio</Link>
          </div>
        )}
      </div>
    </section>
  );
}

// Fecha inválida o ausente se muestra como «—» (igual que la constancia BFA).
function formatoFecha(valor: string | null | undefined) {
  const fecha = valor ? new Date(valor) : null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleString('es') : '—';
}
