import { useRef, useState } from 'react';
import type { SaveState } from '../../../components/SaveStatus';

type FluidezVerbalProps = {
  /** Letra de la aplicación; la define el evaluador, no es una constante de la prueba. */
  letra: string;
  palabras: string[];
  maxEntradas?: number;
  /** Estado del guardado (E7); con él se muestra cuántas palabras quedaron guardadas. */
  guardado?: SaveState;
  onChange: (palabras: string[]) => void;
};

/** Grilla de entradas de Fluidez Verbal: Enter pasa a la siguiente y la letra siempre se ve. */
export function FluidezVerbal({
  letra,
  palabras,
  maxEntradas = 75,
  guardado,
  onChange,
}: FluidezVerbalProps) {
  const entradas = useRef<(HTMLInputElement | null)[]>([]);
  const escritas = palabras.filter((palabra) => palabra.trim() !== '').length;
  // Último conteo confirmado: solo cambia cuando el guardado termina bien.
  const [guardadas, setGuardadas] = useState(escritas);
  if (guardado === 'saved' && guardadas !== escritas) setGuardadas(escritas);

  const cambiar = (indice: number, valor: string) => {
    const siguiente = Array.from({ length: maxEntradas }, (_, i) => palabras[i] ?? '');
    siguiente[indice] = valor;
    onChange(siguiente);
  };

  return (
    <div className="fluidez">
      <div className="fluidez-cabecera">
        <span className="fluidez-letra" aria-hidden="true">
          {letra}
        </span>
        <div>
          <p className="fluidez-titulo">Letra asignada: {letra}</p>
          <p className="fluidez-conteo" aria-live="polite">
            {escritas} de {maxEntradas} palabras escritas
            {guardado && ` · ${guardadas} guardadas`}
          </p>
          {escritas >= maxEntradas && (
            <p className="fluidez-conteo" role="status">
              Llegaste al máximo de {maxEntradas} palabras.
            </p>
          )}
        </div>
      </div>
      <ol className="fluidez-lista" aria-label="Palabras escritas">
        {Array.from({ length: maxEntradas }, (_, indice) => (
          <li key={indice}>
            <label className="fluidez-entrada">
              <span className="fluidez-numero" aria-hidden="true">
                {indice + 1}
              </span>
              <input
                ref={(elemento) => {
                  entradas.current[indice] = elemento;
                }}
                type="text"
                lang="es"
                aria-label={`Palabra ${indice + 1}`}
                value={palabras[indice] ?? ''}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(evento) => cambiar(indice, evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key !== 'Enter') return;
                  evento.preventDefault();
                  entradas.current[indice + 1]?.focus();
                }}
              />
            </label>
            {(palabras[indice] ?? '') !== '' && (
              <button
                type="button"
                className="fluidez-quitar"
                aria-label={`Quitar palabra ${indice + 1}`}
                onClick={() => {
                  cambiar(indice, '');
                  entradas.current[indice]?.focus();
                }}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
