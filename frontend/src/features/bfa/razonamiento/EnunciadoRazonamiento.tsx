import './razonamiento.css';
import { analizarEnunciado, type Fragmento } from './analizar';

function Hueco() {
  return <span className="razon-hueco" role="img" aria-label="espacio en blanco" />;
}

function Piezas({ fragmentos }: { fragmentos: Fragmento[] }) {
  return (
    <>{fragmentos.map((f, i) => (f.hueco ? <Hueco key={i} /> : <span key={i}>{f.texto}</span>))}</>
  );
}

/**
 * Enunciado de Razonamiento A y B: series, analogías y relaciones conceptuales. Conserva cada
 * número, letra, palabra y símbolo tal como llega y evita que el navegador lo traduzca.
 */
export function EnunciadoRazonamiento({ texto }: { texto: string }) {
  const a = analizarEnunciado(texto);

  if (a.tipo === 'serie') {
    const lectura = a.items
      .map(({ fragmento }) => (fragmento.hueco ? 'espacio en blanco' : fragmento.texto))
      .join(', ');
    return (
      <span
        className={`razon razon-serie${a.numerica ? ' razon-serie--numerica' : ''}`}
        role="img"
        aria-label={`Serie: ${lectura}`}
        translate="no"
      >
        {a.items.map(({ fragmento, sep }, i) => (
          <span key={i} className="razon-item" aria-hidden="true">
            {fragmento.hueco ? <span className="razon-hueco" /> : fragmento.texto}
            {sep.trim()}
            {i < a.items.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    );
  }

  if (a.tipo === 'razon') {
    return (
      <span className="razon razon-analogia" translate="no">
        {a.grupos.map(([izq, der], i) => (
          <span key={i} className="razon-grupo">
            <span className="razon-par">
              <Piezas fragmentos={izq} />
              <span className="razon-signo"> : </span>
              <Piezas fragmentos={der} />
            </span>
            {i === 0 && <span className="razon-signo razon-igual"> :: </span>}
          </span>
        ))}
      </span>
    );
  }

  if (a.tipo === 'esA') {
    return (
      <span className="razon razon-analogia razon-analogia--frase" translate="no">
        <span className="razon-clausula">
          <Piezas fragmentos={a.clausulas[0]} />
        </span>{' '}
        <span className="razon-conector">{a.conector}</span>{' '}
        <span className="razon-clausula">
          <Piezas fragmentos={a.clausulas[1]} />
        </span>
      </span>
    );
  }

  return (
    <span className="razon razon-texto" translate="no">
      <Piezas fragmentos={a.fragmentos} />
    </span>
  );
}
