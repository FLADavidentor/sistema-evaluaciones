// Analiza el enunciado de R1/R2 solo para decidir CÓMO se dibuja. Nunca modifica el texto:
// todo lo que no es una marca de hueco se conserva carácter por carácter.
//
// Formato supuesto (E6 solo entrega `enunciado: string`; DOC-08 y BFA-BE-04 deben confirmarlo):
//  - Hueco: `___` (dos o más guiones bajos), `[ ]`, `( )`, `□` o un `?` suelto.
//  - Serie: términos separados por `,` `;` ` - ` o `→` con un hueco: «2, 4, 8, ___».
//  - Analogía: «a : b :: c : ___» o «a es a b como c es a ___».
//  - Cualquier otro texto se muestra tal cual, con el hueco dibujado si lo trae.

export type Fragmento = { hueco: false; texto: string } | { hueco: true; marca: string };

export interface ItemSerie {
  fragmento: Fragmento;
  /** Separador exacto que sigue al término, tal como llegó. */
  sep: string;
}

export type EnunciadoAnalizado =
  | { tipo: 'serie'; items: ItemSerie[]; numerica: boolean }
  | { tipo: 'razon'; grupos: [Fragmento[], Fragmento[]][] }
  | { tipo: 'esA'; clausulas: [Fragmento[], Fragmento[]]; conector: string }
  | { tipo: 'texto'; fragmentos: Fragmento[] };

const MARCA_HUECO = /_{2,}|□|\[\s*\]|\(\s*\)|\?/g;
const ES_MARCA = /^(?:_{2,}|□|\[\s*\]|\(\s*\)|\?)$/;
const TERMINO_NUMERICO = /^[+\-−–]?\d+(?:[.,]\d+)?(?:\/\d+)?%?$/u;
const LETRA_O_NUMERO = /[\p{L}\p{N}]/u;

/** Parte el texto en fragmentos de texto literal y huecos. Un `?` solo es hueco si está suelto. */
export function partirHuecos(texto: string): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  let ultimo = 0;
  for (const coincidencia of texto.matchAll(MARCA_HUECO)) {
    const inicio = coincidencia.index ?? 0;
    const marca = coincidencia[0];
    if (marca === '?') {
      const antes = texto[inicio - 1];
      const despues = texto[inicio + 1];
      const pegado = (c: string | undefined) => c !== undefined && LETRA_O_NUMERO.test(c);
      if (pegado(antes) || pegado(despues) || antes === '¿') continue;
    }
    if (inicio > ultimo) fragmentos.push({ hueco: false, texto: texto.slice(ultimo, inicio) });
    fragmentos.push({ hueco: true, marca });
    ultimo = inicio + marca.length;
  }
  if (ultimo < texto.length) fragmentos.push({ hueco: false, texto: texto.slice(ultimo) });
  return fragmentos;
}

// Separadores explícitos, del más al menos específico. El espacio solo vale para términos mínimos.
const SEPARADORES = [/(\s*;\s*)/, /(\s*,\s+)/, /(\s+[-–—]\s+)/, /(\s*→\s*)/];

function comoSerie(texto: string): EnunciadoAnalizado | null {
  const intentos: { patron: RegExp; solo: 'cualquiera' | 'minimos' }[] = [
    ...SEPARADORES.map((patron) => ({ patron, solo: 'cualquiera' as const })),
    { patron: /(\s+)/, solo: 'minimos' },
  ];
  for (const { patron, solo } of intentos) {
    const partes = texto.split(patron);
    if (partes.length < 5) continue; // al menos tres términos
    const items: ItemSerie[] = [];
    let valido = true;
    for (let i = 0; i < partes.length; i += 2) {
      const termino = partes[i];
      const sep = partes[i + 1] ?? '';
      if (ES_MARCA.test(termino)) {
        items.push({ fragmento: { hueco: true, marca: termino }, sep });
        continue;
      }
      const corto = termino.length > 0 && termino.length <= 12 && !/\s/.test(termino);
      const minimo = TERMINO_NUMERICO.test(termino) || /^\p{L}{1,2}$/u.test(termino);
      if (!corto || (solo === 'minimos' && !minimo)) {
        valido = false;
        break;
      }
      items.push({ fragmento: { hueco: false, texto: termino }, sep });
    }
    const huecos = items.filter((item) => item.fragmento.hueco).length;
    if (!valido || huecos < 1 || huecos > 2) continue;
    const numerica = items.every(
      ({ fragmento }) => fragmento.hueco || TERMINO_NUMERICO.test(fragmento.texto),
    );
    return { tipo: 'serie', items, numerica };
  }
  return null;
}

function comoRazon(texto: string): EnunciadoAnalizado | null {
  const mitades = texto.split(/\s*::\s*/);
  if (mitades.length !== 2) return null;
  const grupos: [Fragmento[], Fragmento[]][] = [];
  for (const mitad of mitades) {
    const par = mitad.split(/\s*:\s*/);
    if (par.length !== 2 || par.some((p) => p === '')) return null;
    grupos.push([partirHuecos(par[0]), partirHuecos(par[1])]);
  }
  return { tipo: 'razon', grupos };
}

function comoEsA(texto: string): EnunciadoAnalizado | null {
  const m = /^(.+?\bes a\b.+?)(\s+como\s+)(.+?\bes a\b.+)$/i.exec(texto);
  if (!m) return null;
  return {
    tipo: 'esA',
    clausulas: [partirHuecos(m[1]), partirHuecos(m[3])],
    conector: m[2].trim(),
  };
}

export function analizarEnunciado(enunciado: string): EnunciadoAnalizado {
  const texto = enunciado.trim();
  return (
    comoRazon(texto) ??
    comoEsA(texto) ??
    comoSerie(texto) ?? { tipo: 'texto', fragmentos: partirHuecos(enunciado) }
  );
}
