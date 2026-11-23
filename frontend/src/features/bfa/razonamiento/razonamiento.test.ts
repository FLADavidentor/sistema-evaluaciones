import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EnunciadoRazonamiento } from './EnunciadoRazonamiento';
import { OpcionRazonamiento } from './OpcionRazonamiento';

const html = (texto: string) =>
  renderToStaticMarkup(createElement(EnunciadoRazonamiento, { texto }));
const entidades: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
};
/** Texto visible: sin etiquetas y con las entidades de HTML ya resueltas. */
const visible = (marcado: string) =>
  marcado.replace(/<[^>]+>/g, '').replace(/&(?:amp|lt|gt|quot|#x27);/g, (e) => entidades[e]);
const huecos = (marcado: string) => (marcado.match(/razon-hueco/g) ?? []).length;

describe('dibujo de Razonamiento A y B', () => {
  it('serie: muestra cada término y un solo hueco, y la lee completa', () => {
    const marcado = html('2, 4, 8, 16, ___');
    expect(visible(marcado)).toBe('2, 4, 8, 16, ');
    expect(huecos(marcado)).toBe(1);
    expect(marcado).toContain('aria-label="Serie: 2, 4, 8, 16, espacio en blanco"');
  });

  it('serie de letras: no cambia mayúsculas ni agrega nada', () => {
    expect(visible(html('A, C, E, G, ___'))).toBe('A, C, E, G, ');
    expect(visible(html('z, x, v, ___'))).toBe('z, x, v, ');
  });

  it('el navegador no debe traducir ni alterar el contenido', () => {
    expect(html('A, C, E, ___')).toContain('translate="no"');
    expect(html('frío : calor :: noche : ___')).toContain('translate="no"');
    expect(renderToStaticMarkup(createElement(OpcionRazonamiento, { texto: '12' }))).toContain(
      'translate="no"',
    );
  });

  it('analogía con dos puntos: conserva palabras con acento y el hueco', () => {
    const marcado = html('frío : calor :: noche : ___');
    expect(visible(marcado)).toBe('frío : calor :: noche : ');
    expect(huecos(marcado)).toBe(1);
  });

  it('analogía con «es a … como»: conserva la frase y el conector', () => {
    const marcado = html('Pie es a zapato como mano es a ___');
    expect(visible(marcado)).toBe('Pie es a zapato como mano es a ');
    expect(marcado).toContain('razon-conector');
    expect(huecos(marcado)).toBe(1);
  });

  it('relación conceptual: texto libre, símbolos intactos y sin hueco inventado', () => {
    const texto = 'Si a < b & b > c, ¿cuál es mayor? «ñandú» ± ½';
    const marcado = html(texto);
    expect(visible(marcado)).toBe(texto);
    expect(huecos(marcado)).toBe(0);
  });

  it('un enunciado con script o etiquetas se muestra como texto, nunca se ejecuta', () => {
    const marcado = html('<b>2</b>, <script>alert(1)</script>, ___');
    expect(marcado).not.toContain('<script>');
    expect(marcado).not.toContain('<b>');
  });

  it('las alternativas muestran su texto exacto', () => {
    const opcion = (texto: string) =>
      visible(renderToStaticMarkup(createElement(OpcionRazonamiento, { texto })));
    expect(opcion('64')).toBe('64');
    expect(opcion('Ñ')).toBe('Ñ');
    expect(opcion('oír')).toBe('oír');
    expect(opcion('<')).toBe('<');
  });
});
