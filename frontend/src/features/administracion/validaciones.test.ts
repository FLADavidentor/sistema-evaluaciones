import { describe, expect, it } from 'vitest';
import {
  analizarJson,
  analizarOpciones,
  validarBaremo,
  validarClave,
  validarConfiguracion,
  validarOpciones,
  validarPregunta,
} from './validaciones';

const campos = (errores: { campo: string }[]) => errores.map((e) => e.campo);

describe('analizarJson', () => {
  it('acepta JSON y rechaza texto roto', () => {
    expect(analizarJson('{"a":1}')).toEqual({ valor: { a: 1 } });
    expect(analizarJson('{a')).toHaveProperty('error');
  });
});

describe('validarConfiguracion (E26)', () => {
  it('acepta una configuración válida', () => {
    const c = { orden: 1, tiempoLimiteSegundos: 300, tipoRespuesta: 'SELECCION', opciones: 5 };
    expect(validarConfiguracion({ ...c, maximoEntradas: null, tienePractica: true })).toEqual([]);
  });

  it('señala campos con tipo o valor incorrecto', () => {
    const errores = validarConfiguracion({
      orden: 0,
      tiempoLimiteSegundos: '5',
      tipoRespuesta: 'OTRO',
      opciones: 1,
      tienePractica: 'si',
    });
    expect(campos(errores)).toEqual([
      'orden',
      'tiempoLimiteSegundos',
      'opciones',
      'tipoRespuesta',
      'tienePractica',
    ]);
  });

  it('rechaza lo que no es objeto', () => {
    expect(validarConfiguracion([])).toHaveLength(1);
  });
});

describe('validarPregunta (E27)', () => {
  it('exige número, orden y enunciado', () => {
    expect(validarPregunta({ numeroVisible: 1, ordenPresentacion: 1, enunciado: 'Texto' })).toEqual(
      [],
    );
    expect(campos(validarPregunta({}))).toEqual([
      'numeroVisible',
      'ordenPresentacion',
      'enunciado',
    ]);
  });
});

describe('validarOpciones (E28)', () => {
  it('pide al menos dos opciones con letra única', () => {
    expect(
      validarOpciones({
        opciones: [
          { letra: 'A', texto: 'x' },
          { letra: 'B', texto: 'y' },
        ],
      }),
    ).toEqual([]);
    expect(validarOpciones({ opciones: [{ letra: 'A', texto: 'x' }] })).toHaveLength(1);
    expect(
      campos(
        validarOpciones({
          opciones: [
            { letra: 'A', texto: 'x' },
            { letra: 'a', texto: '' },
          ],
        }),
      ),
    ).toEqual(['opciones[1].letra', 'opciones[1].texto']);
  });

  it('exige el campo opciones', () => {
    expect(validarOpciones({})).toEqual([{ campo: 'opciones', mensaje: 'es obligatorio' }]);
  });
});

describe('validarClave (E29)', () => {
  it('valida entradas y repetidos', () => {
    expect(validarClave({ entradas: [{ preguntaId: 1, opcion: 'A' }] })).toEqual([]);
    expect(
      campos(validarClave({ entradas: [{ preguntaId: 1, opcion: 'A' }, { preguntaId: 1 }] })),
    ).toEqual(['entradas[1].preguntaId', 'entradas[1].opcion']);
    expect(campos(validarClave({}))).toEqual(['entradas']);
  });
});

describe('validarBaremo (E30)', () => {
  const base = { nombre: 'B', version: '1', anioNorma: 2000 };

  it('acepta rangos y celdas sin dato', () => {
    const rangos = [
      { idFactor: 'F1', percentil: 10, limiteInferior: 0, limiteSuperior: 4, estadoCelda: 'RANGO' },
      { idFactor: 'F1', percentil: 20, estadoCelda: 'SIN_DATO' },
    ];
    expect(validarBaremo({ ...base, rangos })).toEqual([]);
  });

  it('señala percentil fuera de 1–99 y límite inferior ausente en RANGO', () => {
    const errores = validarBaremo({
      ...base,
      rangos: [{ idFactor: 'F1', percentil: 100, estadoCelda: 'RANGO' }],
    });
    expect(campos(errores)).toEqual(['rangos[0].percentil', 'rangos[0].limiteInferior']);
  });

  it('exige rangos y datos generales', () => {
    expect(campos(validarBaremo({}))).toEqual(['nombre', 'version', 'anioNorma', 'rangos']);
  });
});

describe('analizarOpciones', () => {
  it('convierte «letra = texto» por línea y conserva los signos = del texto', () => {
    expect(analizarOpciones('A = uno\n\nB = x = y')).toEqual([
      { letra: 'A', texto: 'uno' },
      { letra: 'B', texto: 'x = y' },
    ]);
  });
});
