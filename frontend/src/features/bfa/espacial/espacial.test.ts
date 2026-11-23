import { describe, expect, it } from 'vitest';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import { materialEspacial } from './material';

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

describe('material de la familia Espacial', () => {
  it('cada ítem trae una figura por alternativa (S1 y S2: 4, S1b: 5), todas distintas', () => {
    const esperadas = { S1: 4, S2: 4, S1b: 5 };
    for (const [codigo, n] of Object.entries(esperadas)) {
      for (const item of materialEspacial(codigo) ?? []) {
        expect(item.opciones).toHaveLength(n);
        expect(new Set(item.opciones).size).toBe(n);
      }
    }
  });

  it('baraja las alternativas entre ítems y no toca otras subpruebas', () => {
    const primeras = materialEspacial('S1')?.map((i) => i.opciones[0]);
    expect(new Set(primeras).size).toBe(4);
    expect(materialEspacial('R1')).toBeUndefined();
  });
});

describe('S1, S2 y S1b en la API simulada', () => {
  it.each(['S1', 'S2', 'S1b'])(
    '%s entrega estímulo y alternativas como figuras',
    async (codigo) => {
      const preguntas = await preguntasDe(codigo);
      expect(preguntas).toHaveLength(2);
      for (const p of preguntas) {
        expect(p.recursoUrl).toMatch(
          /^\/material\/bfa-espacial\/\d\d-(modelo|alternativa-\d)\.jpg$/,
        );
        for (const o of p.opciones) {
          expect(o.recursoUrl).toMatch(
            /^\/material\/bfa-espacial\/\d\d-(modelo|alternativa-\d)\.jpg$/,
          );
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
