import { describe, expect, it } from 'vitest';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import { aDataUrl, cubos, poligono } from './figuras';
import { MATERIAL_ESPACIAL } from './material';

const svg = (url: string) => decodeURIComponent(url.replace('data:image/svg+xml,', ''));

async function preguntasDe(codigo: string) {
  const api = new BfaApiSimulada({ ahora: () => 0, preguntasPorSubprueba: 2 });
  const { id } = await api.iniciarEvaluacion({
    versionFormularioId: 10,
    sujetoId: 1,
    periodoId: 1,
    subpruebas: [codigo],
  });
  await api.iniciarSubprueba(id, codigo);
  return (await api.obtenerPreguntas(id, codigo)).preguntas;
}

describe('figuras sintéticas de la familia Espacial', () => {
  it('genera un SVG 120×80 como data URL', () => {
    const url = aDataUrl('<circle r="1"/>');
    expect(url.startsWith('data:image/svg+xml,')).toBe(true);
    expect(svg(url)).toContain('viewBox="0 0 120 80"');
  });

  it('el polígono reflejado y el girado difieren del original', () => {
    const forma: [number, number][] = [
      [10, 10],
      [50, 10],
      [10, 40],
    ];
    expect(svg(poligono(forma, 0, true))).toContain('scale(-1 1)');
    expect(svg(poligono(forma, 90))).toContain('rotate(90)');
    expect(poligono(forma)).not.toBe(poligono(forma, 0, true));
  });

  it('dibuja tres caras por cubo', () => {
    expect(svg(cubos([2, 1])).match(/<polygon/g)).toHaveLength(9);
  });

  it('cada ítem trae una figura por alternativa (S1 y S2: 4, S1b: 5)', () => {
    const esperadas = { S1: 4, S2: 4, S1b: 5 };
    for (const [codigo, n] of Object.entries(esperadas)) {
      for (const item of MATERIAL_ESPACIAL[codigo]) expect(item.opciones).toHaveLength(n);
    }
  });
});

describe('S1, S2 y S1b en la API simulada', () => {
  it.each(['S1', 'S2', 'S1b'])(
    '%s entrega estímulo y alternativas como figuras',
    async (codigo) => {
      const preguntas = await preguntasDe(codigo);
      expect(preguntas).toHaveLength(2);
      for (const p of preguntas) {
        expect(p.recursoUrl).toMatch(/^data:image\/svg\+xml,/);
        for (const o of p.opciones) {
          expect(o.recursoUrl).toMatch(/^data:image\/svg\+xml,/);
          expect(o.texto).toBe(`Figura ${o.letra}`);
        }
      }
    },
  );

  it('las subpruebas que no son de figuras no traen recursos', async () => {
    const [p] = await preguntasDe('R1');
    expect(p.recursoUrl).toBeUndefined();
    expect(p.opciones.every((o) => o.recursoUrl === undefined)).toBe(true);
  });
});
