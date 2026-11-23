/** Palabras y sentencias de VOC1, VOC2 y CV tal como llegan, sin que el navegador las traduzca. */
export function TextoVerbal({ texto }: { texto: string }) {
  return (
    <span className="verbal" lang="es" translate="no">
      {texto}
    </span>
  );
}
