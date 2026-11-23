import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BfaApiSimulada } from '../api/bfaApiSimulada';
import { ControladorBfa } from '../flujo/controlador';
import { VistaFlujo } from '../vistas/VistaFlujo';
import { FluidezVerbal } from './FluidezVerbal';

const nada = () => undefined;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Fluidez Verbal: pantalla de entrada', () => {
  it('muestra la letra, el conteo escrito y guardado, y una entrada por palabra permitida', () => {
    const html = renderToStaticMarkup(
      <FluidezVerbal
        letra="M"
        palabras={['mesa', '', 'mano']}
        maxEntradas={5}
        guardado="saved"
        onChange={nada}
      />,
    );
    expect(html).toContain('Letra asignada: M');
    expect(html).toContain('2 de 5 palabras escritas · 2 guardadas');
    expect(html.match(/<input/g)).toHaveLength(5);
    expect(html).toContain('aria-label="Quitar palabra 1"');
    expect(html).not.toContain('aria-label="Quitar palabra 2"');
    expect(html).toContain('aria-label="Quitar palabra 3"');
  });

  it('avisa al llegar al máximo y no ofrece una entrada más', () => {
    const html = renderToStaticMarkup(
      <FluidezVerbal letra="S" palabras={['sol', 'sal']} maxEntradas={2} onChange={nada} />,
    );
    expect(html).toContain('Llegaste al máximo de 2 palabras.');
    expect(html.match(/<input/g)).toHaveLength(2);
  });

  it('no autocorrige ni completa lo que se escribe', () => {
    const html = renderToStaticMarkup(
      <FluidezVerbal letra="Ñ" palabras={['ñandú']} onChange={nada} />,
    );
    expect(html).toContain('value="ñandú"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('spellCheck="false"');
  });
});

describe('Fluidez Verbal dentro del flujo', () => {
  it('tras recargar retoma letra, palabras guardadas y tiempo del servidor', async () => {
    const datos = new Map<string, string>();
    const almacen = {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    };
    const api = new BfaApiSimulada({ almacen });
    const { id } = await api.iniciarEvaluacion({
      versionFormularioId: 10,
      sujetoId: 1,
      periodoId: 1,
      fluidez: { letraInicial: 'M' },
      subpruebas: ['FV'],
    });
    const c = new ControladorBfa(api, id, { esperaGuardadoMs: 0 });
    await c.cargar();
    c.continuar();
    c.continuar();
    await esperar(10);
    c.escribirPalabras(['mesa', 'mano']);
    await esperar(20);

    // Otra pestaña o una recarga: nueva API sobre el mismo estado guardado.
    const otro = new ControladorBfa(new BfaApiSimulada({ almacen }), id, { esperaGuardadoMs: 0 });
    await otro.cargar();
    const html = renderToStaticMarkup(
      <VistaFlujo estado={otro.obtenerEstado()} controlador={otro} alSalir={nada} />,
    );
    expect(html).toContain('Letra asignada: M');
    expect(html).toContain('value="mesa"');
    expect(html).toContain('2 de 75 palabras escritas · 2 guardadas');
    expect(html).toContain('Se recuperó la sesión');
    expect(html).toMatch(/0?4:5\d|05:00/);
  });
});
