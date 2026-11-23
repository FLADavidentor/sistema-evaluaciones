import './razonamiento.css';

/** Alternativa de R1/R2: números, letras o palabras sin traducir ni sustituir ningún carácter. */
export function OpcionRazonamiento({ texto }: { texto: string }) {
  return (
    <span className="razon razon-opcion" translate="no">
      {texto}
    </span>
  );
}
