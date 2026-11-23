import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Constancia } from './VistaFlujo';

describe('Constancia (GEN-04-FE)', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Constancia
        estado={{
          fase: 'finalizada',
          estadoResultado: 'PENDIENTE_VALIDACION',
          evaluacionId: 15,
          fechaFin: '2026-11-23T16:00:00Z',
          subpruebasAplicadas: 13,
        }}
        alSalir={() => {}}
      />
    </MemoryRouter>,
  );

  it('muestra los datos del cierre sin enlazar a los resultados', () => {
    expect(html).toContain('Evaluación finalizada');
    expect(html).toContain('N.º 15');
    expect(html).not.toContain('/resultados');
    expect(html).toContain('pendiente de validación');
  });

  it('no muestra puntuaciones ni percentiles a la persona evaluada', () => {
    expect(html).not.toMatch(/percentil|puntuaci/i);
  });
});
