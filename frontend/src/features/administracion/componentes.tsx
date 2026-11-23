import { useId, useState, type ReactNode } from 'react';
import { MensajeError } from '../evaluacion/componentes/MensajeError';
import type { DetalleCampo } from '../evaluacion/tipos';
import type { useEnvio } from './useEnvio';
import { analizarJson } from './validaciones';

type Envio = ReturnType<typeof useEnvio>['estado'];

/** Resultado de la última llamada: error del contrato o confirmación. */
export function ResultadoEnvio({ estado }: { estado: Envio }) {
  if (estado.pendiente)
    return (
      <p role="status" className="ev-ayuda">
        Enviando…
      </p>
    );
  if (estado.error) return <MensajeError error={estado.error} />;
  if (estado.ok)
    return (
      <p role="status" className="ev-confirmado">
        {estado.ok}
      </p>
    );
  return null;
}

export function ErroresCliente({ errores }: { errores: DetalleCampo[] }) {
  if (errores.length === 0) return null;
  return (
    <ul className="ev-error-detalles" role="alert">
      {errores.map((e) => (
        <li key={`${e.campo}-${e.mensaje}`}>
          <strong>{e.campo}</strong>: {e.mensaje}
        </li>
      ))}
    </ul>
  );
}

export function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="ev-campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children(id)}
    </div>
  );
}

interface CajaJsonProps {
  titulo: string;
  ejemplo: string;
  validar: (valor: unknown) => DetalleCampo[];
  /** Recibe el JSON ya validado en el cliente. */
  onEnviar: (valor: unknown) => void;
  deshabilitado?: boolean;
}

/** Cuadro para pegar JSON, validado contra el esquema antes de llamar a la API. */
export function CajaJson({ titulo, ejemplo, validar, onEnviar, deshabilitado }: CajaJsonProps) {
  const [texto, setTexto] = useState('');
  const [errores, setErrores] = useState<DetalleCampo[]>([]);
  const enviar = () => {
    const analizado = analizarJson(texto);
    const encontrados =
      'error' in analizado
        ? [{ campo: 'json', mensaje: analizado.error }]
        : validar(analizado.valor);
    setErrores(encontrados);
    if (encontrados.length === 0 && 'valor' in analizado) onEnviar(analizado.valor);
  };
  return (
    <Campo etiqueta={titulo}>
      {(id) => (
        <>
          <textarea
            id={id}
            className="ev-input adm-json"
            rows={10}
            spellCheck={false}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <ErroresCliente errores={errores} />
          <div className="ev-acciones">
            <button
              type="button"
              className="ev-boton ev-boton--secundario"
              onClick={() => setTexto(ejemplo)}
            >
              Cargar ejemplo ficticio
            </button>
            <button type="button" className="ev-boton" disabled={deshabilitado} onClick={enviar}>
              Validar y enviar
            </button>
          </div>
        </>
      )}
    </Campo>
  );
}
