import { describe, expect, it } from 'vitest';
import { analizarEnunciado, partirHuecos, type EnunciadoAnalizado } from './analizar';

const serie = (e: EnunciadoAnalizado) => {
  if (e.tipo !== 'serie') throw new Error(`se esperaba serie y fue ${e.tipo}`);
  return e;
};
/** Reconstruye el texto con la marca original del hueco: debe ser idéntico a lo recibido. */
const reconstruir = (e: ReturnType<typeof serie>) =>
  e.items
    .map(({ fragmento, sep }) => (fragmento.hueco ? fragmento.marca : fragmento.texto) + sep)
    .join('');

describe('series de R1 y R2', () => {
  it('serie numérica con comas', () => {
    const e = serie(analizarEnunciado('2, 4, 8, 16, ___'));
    expect(e.numerica).toBe(true);
    expect(e.items.map((i) => (i.fragmento.hueco ? '□' : i.fragmento.texto))).toEqual([
      '2',
      '4',
      '8',
      '16',
      '□',
    ]);
    expect(reconstruir(e)).toBe('2, 4, 8, 16, ___');
  });

  it('negativos, decimales con punto y con coma, fracciones y porcentajes', () => {
    expect(serie(analizarEnunciado('−3; −1.5; 0; 1.5; ?')).numerica).toBe(true);
    expect(serie(analizarEnunciado('1/2; 3/4; 1; 5/4; ?')).numerica).toBe(true);
    expect(serie(analizarEnunciado('10%, 20%, 30%, ___')).numerica).toBe(true);
    expect(serie(analizarEnunciado('2,5; 5; 7,5; ___')).numerica).toBe(true);
  });

  it('serie de letras', () => {
    const e = serie(analizarEnunciado('A, C, E, G, ___'));
    expect(e.numerica).toBe(false);
    expect(reconstruir(e)).toBe('A, C, E, G, ___');
  });

  it('conserva letras con acento, eñe y mayúsculas y minúsculas', () => {
    const e = serie(analizarEnunciado('Ñ, O, P, ñ, ___'));
    expect(reconstruir(e)).toBe('Ñ, O, P, ñ, ___');
  });

  it.each([
    ['guiones', '3 - 6 - 12 - ___'],
    ['flechas', '2 → 4 → 8 → ___'],
    ['punto y coma', '1; 3; 5; ?'],
    ['solo espacios con términos mínimos', '2 4 8 16 ?'],
    ['cuadro vacío', '2, 4, 8, □'],
    ['corchetes', '5, 10, 15, [ ]'],
    ['paréntesis', '5, 10, 15, ( )'],
  ])('separa por %s sin cambiar el texto', (_nombre, texto) => {
    expect(reconstruir(serie(analizarEnunciado(texto)))).toBe(texto);
  });

  it('admite un hueco intermedio', () => {
    const e = serie(analizarEnunciado('2, 4, ___, 16, 32'));
    expect(e.items.filter((i) => i.fragmento.hueco)).toHaveLength(1);
  });

  it('una frase no es una serie aunque tenga coma o pocas palabras', () => {
    expect(analizarEnunciado('Si llueve, me quedo en casa ___').tipo).toBe('texto');
    expect(analizarEnunciado('El gato come ___').tipo).toBe('texto');
  });

  it('sin hueco no es serie', () => {
    expect(analizarEnunciado('2, 4, 8, 16, 32').tipo).toBe('texto');
  });
});

describe('analogías y relaciones conceptuales de R2', () => {
  it('analogía con dos puntos', () => {
    const e = analizarEnunciado('frío : calor :: noche : ___');
    expect(e.tipo).toBe('razon');
    if (e.tipo !== 'razon') return;
    expect(e.grupos).toHaveLength(2);
    expect(e.grupos[1][1]).toEqual([{ hueco: true, marca: '___' }]);
  });

  it('analogía con «es a … como … es a»', () => {
    const e = analizarEnunciado('Pie es a zapato como mano es a ___');
    expect(e.tipo).toBe('esA');
    if (e.tipo !== 'esA') return;
    expect(e.conector).toBe('como');
    expect(e.clausulas[1].some((f) => f.hueco)).toBe(true);
  });

  it('una relación conceptual en texto libre se muestra tal cual', () => {
    const texto = '¿Qué palabra no pertenece al grupo? perro, gato, mesa';
    const e = analizarEnunciado(texto);
    expect(e.tipo).toBe('texto');
    if (e.tipo === 'texto') expect(e.fragmentos).toEqual([{ hueco: false, texto }]);
  });
});

describe('huecos', () => {
  it('un «?» pegado a una palabra o a «¿» no es hueco', () => {
    expect(partirHuecos('¿Cuál sigue?')).toEqual([{ hueco: false, texto: '¿Cuál sigue?' }]);
    expect(partirHuecos('¿qué?')).toHaveLength(1);
  });

  it('un «?» suelto sí es hueco', () => {
    expect(partirHuecos('2, 4, ?').some((f) => f.hueco)).toBe(true);
  });

  it('conserva símbolos y caracteres especiales sin tocarlos', () => {
    const texto = 'a < b & b > c ± √ ÷ × ½ ñ ü « » "x" \'y\' ';
    const fragmentos = partirHuecos(texto);
    expect(fragmentos.map((f) => (f.hueco ? f.marca : f.texto)).join('')).toBe(texto);
  });
});
