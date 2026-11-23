import type { ReactNode } from 'react';
import { SaveStatus, type SaveState } from '../../../components/SaveStatus';
import { TestNotice, type TestNoticeData } from '../../../components/TestNotice';

type HojaSimpleProps = {
  nombre: string;
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  /** Segundos que quedan, si el tiempo oficial sigue corriendo; sin él se muestra «—». */
  segundos?: number | null;
  guardado?: SaveState;
  aviso?: TestNoticeData;
  /** Sin acción, la hoja no muestra pie (carga, cierre en curso). */
  accion?: { texto: string; alPulsar: () => void };
};

function formatoReloj(segundos: number | null | undefined) {
  if (segundos === null || segundos === undefined) return '—';
  const s = Math.max(0, segundos);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Hoja de test con el mismo marco que `TestScreen`, para pantallas que no son preguntas.
 * Vive en el módulo BFA para no modificar los componentes compartidos.
 */
export function HojaSimple({
  nombre,
  etiqueta,
  titulo,
  descripcion,
  children,
  segundos,
  guardado,
  aviso,
  accion,
}: HojaSimpleProps) {
  return (
    <section className="test-paper" aria-labelledby="hoja-simple-titulo" aria-busy={!accion}>
      <header className="test-header">
        <span className="test-name">{nombre}</span>
        <time
          className="test-timer"
          dateTime={typeof segundos === 'number' ? `PT${Math.max(0, segundos)}S` : undefined}
        >
          {formatoReloj(segundos)}
        </time>
      </header>
      <div className="test-content">
        <section className="phase-panel">
          <p className="phase-label">{etiqueta}</p>
          <h1 className="question-prompt" id="hoja-simple-titulo">
            {titulo}
          </h1>
          {descripcion && <p className="phase-description">{descripcion}</p>}
          {aviso && <TestNotice {...aviso} />}
          {children}
        </section>
      </div>
      {accion && (
        <footer className={`test-footer${guardado ? '' : ' test-footer--solo'}`}>
          {guardado && <SaveStatus state={guardado} />}
          <button className="primary-action" type="button" onClick={accion.alPulsar}>
            {accion.texto}
          </button>
        </footer>
      )}
    </section>
  );
}
