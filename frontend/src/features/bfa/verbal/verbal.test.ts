import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import { presentacionDe } from '../familias';
import { MATERIAL_VERBAL } from './material';
import { TextoVerbal } from './TextoVerbal';

const html = (texto: string) => renderToStaticMarkup(createElement(TextoVerbal, { texto }));

async function preguntasDe(codigo: string) {
  const api = new BfaApiSimulada({ ahora: () => 0, preguntasPorSubprueba: 3 });
  const { id } = await api.iniciarEvaluacion({
    versionFormularioId: 10,
    sujetoId: 1,
    periodoId: 1,
    subpruebas: [codigo],
  });
  await api.iniciarSubprueba(id, codigo);
  return (await api.obtenerPreguntas(id, codigo)).preguntas;
}

describe('dibujo de la familia Verbal', () => {
  it('conserva tildes, eñes y mayúsculas, sin traducir', () => {
    const marcado = html('ÑANDÚ');
    expect(marcado).toContain('>ÑANDÚ<');
    expect(marcado).toContain('translate="no"');
    expect(marcado).toContain('lang="es"');
  });

  it('un texto con etiquetas se muestra como texto', () => {
    expect(html('<b>hola</b>')).not.toContain('<b>');
  });

  it('presentación según UI-04', () => {
    expect(presentacionDe('VOC1')).toMatchObject({
      promptVariant: 'display',
      optionsLayout: 'list',
    });
    expect(presentacionDe('VOC2')).toMatchObject({
      promptVariant: 'statement',
      optionsLayout: 'compact',
    });
    expect(presentacionDe('CV')).toMatchObject({
      promptVariant: 'statement',
      optionsLayout: 'list',
    });
    for (const codigo of ['VOC1', 'VOC2', 'CV']) {
      expect(presentacionDe(codigo).renderEnunciado).toBeDefined();
      expect(presentacionDe(codigo).renderOpcion).toBeDefined();
    }
  });
});

describe('material ficticio en la API simulada', () => {
  it('VOC1 y VOC2 traen cinco alternativas y CV tres', () => {
    for (const item of MATERIAL_VERBAL.VOC1) expect(item[1]).toHaveLength(5);
    for (const item of MATERIAL_VERBAL.VOC2) expect(item[1]).toHaveLength(5);
    for (const item of MATERIAL_VERBAL.CV) expect(item[1]).toHaveLength(3);
  });

  it('VOC1 entrega la palabra en mayúsculas y sus alternativas', async () => {
    const [p] = await preguntasDe('VOC1');
    expect(p.enunciado).toBe('RÁPIDO');
    expect(p.opciones.map((o) => o.texto)).toEqual([
      'lento',
      'veloz',
      'pesado',
      'quieto',
      'tardío',
    ]);
  });

  it('VOC2 conserva la numeración de la hoja (41 en adelante)', async () => {
    const preguntas = await preguntasDe('VOC2');
    expect(preguntas.map((p) => p.numero)).toEqual([41, 42, 43]);
    expect(preguntas[0].opciones).toHaveLength(5);
  });

  it('CV entrega una sentencia con tres interpretaciones A a C', async () => {
    const [p] = await preguntasDe('CV');
    expect(p.enunciado).toBe(MATERIAL_VERBAL.CV[0][0]);
    expect(p.opciones.map((o) => o.letra)).toEqual(['A', 'B', 'C']);
  });
});
