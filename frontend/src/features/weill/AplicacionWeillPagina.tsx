import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AnswerOption } from '../../components/AnswerOption';
import { clienteWeill } from './cliente';
import { FiguraWeill, PiezaWeill } from './figuras';
import { ubicarItem } from './items';
import { mensajeError } from './mensajes';
import {
  contarGuardados,
  desdeServidor,
  itemLocal,
  primerPendiente,
  resolver,
  solicitar,
  type ItemLocal,
  type ItemsLocales,
} from './respuestas';
import { TiempoRestante } from './TiempoRestante';
import { ITEMS_POR_LAMINA, TOTAL_ITEMS, TOTAL_PIEZAS, type IntentoWeill } from './tipos';
import './weill.css';

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; intento: IntentoWeill };

const PIEZAS = Array.from({ length: TOTAL_PIEZAS }, (_, i) => i + 1);

/** WEI-FE-03 — aplicación de los 60 ítems. Ruta: /weill/intentos/:intentoId */
export function AplicacionWeillPagina() {
  const intentoId = Number(useParams().intentoId);
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });
  const [items, setItems] = useState<ItemsLocales>({});
  const [orden, setOrden] = useState(1);

  const cargar = useCallback(() => {
    setCarga({ fase: 'cargando' });
    clienteWeill
      .obtenerIntento(intentoId)
      .then((intento) => {
        const locales = desdeServidor(intento.respuestas);
        setItems(locales);
        setOrden(primerPendiente(locales));
        setCarga({ fase: 'listo', intento });
      })
      .catch((e: unknown) => setCarga({ fase: 'error', mensaje: mensajeError(e) }));
  }, [intentoId]);

  useEffect(cargar, [cargar]);

  const guardar = useCallback(
    (ordenItem: number, pieza: number | null) => {
      setItems((s) => solicitar(s, ordenItem, pieza));
      clienteWeill.guardarRespuesta(intentoId, ordenItem, pieza).then(
        () => setItems((s) => resolver(s, ordenItem, pieza, true)),
        () => setItems((s) => resolver(s, ordenItem, pieza, false)),
      );
    },
    [intentoId],
  );

  const activo = carga.fase === 'listo' && carga.intento.estado === 'EN_CURSO';

  // Teclas 1–8 eligen la pieza del ítem visible.
  useEffect(() => {
    if (!activo) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const pieza = Number(evento.key);
      if (Number.isInteger(pieza) && pieza >= 1 && pieza <= TOTAL_PIEZAS) {
        evento.preventDefault();
        guardar(orden, pieza);
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [activo, guardar, orden]);

  if (carga.fase === 'cargando') return <p role="status">Cargando el intento…</p>;
  if (carga.fase === 'error')
    return (
      <div className="weill-error" role="alert">
        <p>{carga.mensaje}</p>
        <button className="secondary-action" type="button" onClick={cargar}>
          Reintentar
        </button>
      </div>
    );

  const { intento } = carga;
  if (!activo)
    return (
      <p role="status">
        Este intento ya fue finalizado y no admite cambios. <Link to="/weill">Volver</Link>
      </p>
    );

  const item = itemLocal(items, orden);
  const { lamina, posicion } = ubicarItem(orden);
  const respondidos = contarGuardados(items);

  return (
    <section className="test-paper weill-aplicacion" aria-labelledby="weill-item-titulo">
      <header className="test-header">
        <span className="test-name">Prueba No Verbal · Forma A</span>
        <TiempoRestante finLimite={intento.finLimite} />
      </header>

      <div className="test-content weill-contenido">
        <div className="weill-ubicacion">
          <h1 className="question-counter" id="weill-item-titulo">
            Lámina {lamina} · ítem {posicion} de {ITEMS_POR_LAMINA}
          </h1>
          <label className="weill-progreso">
            {respondidos}/{TOTAL_ITEMS} respondidos
            <progress max={TOTAL_ITEMS} value={respondidos} />
          </label>
        </div>

        <div className="weill-figura-marco">
          <FiguraWeill orden={orden} />
        </div>

        <div
          className="options weill-piezas"
          role="radiogroup"
          aria-label="Piezas candidatas (teclas 1 a 8)"
        >
          {PIEZAS.map((pieza) => (
            <AnswerOption
              key={`${orden}-${pieza}`}
              groupName={`weill-item-${orden}`}
              option={{
                id: String(pieza),
                label: `Pieza ${pieza}`,
                figure: <PiezaWeill orden={orden} pieza={pieza} />,
              }}
              checked={item.pieza === pieza}
              onChange={(id) => guardar(orden, Number(id))}
            />
          ))}
        </div>
      </div>

      <footer className="test-footer">
        <EstadoItem item={item} onReintentar={() => guardar(orden, item.pieza)} />
        <div className="test-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={item.pieza === null}
            onClick={() => guardar(orden, null)}
          >
            Quitar
          </button>
          {intento.permitirRetroceso && (
            <button
              className="secondary-action"
              type="button"
              disabled={orden === 1}
              onClick={() => setOrden(orden - 1)}
            >
              Anterior
            </button>
          )}
          <button
            className="primary-action"
            type="button"
            disabled={orden === TOTAL_ITEMS}
            onClick={() => setOrden(orden + 1)}
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  );
}

const TEXTOS: Record<ItemLocal['estado'], string> = {
  pendiente: 'Pendiente',
  guardando: 'Guardando…',
  guardado: 'Guardado',
  error: 'No se pudo guardar',
};

const ICONOS: Record<ItemLocal['estado'], string> = {
  pendiente: '–',
  guardando: '···',
  guardado: '✓',
  error: '!',
};

function EstadoItem({ item, onReintentar }: { item: ItemLocal; onReintentar: () => void }) {
  return (
    <div className="weill-estado">
      <p
        className={`save-status${item.estado === 'error' ? ' save-status--error' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span className="status-icon" aria-hidden="true">
          {ICONOS[item.estado]}
        </span>
        {TEXTOS[item.estado]}
      </p>
      {item.estado === 'error' && (
        <button className="secondary-action" type="button" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
