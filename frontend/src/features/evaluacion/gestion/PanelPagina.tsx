import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EstadoCarga } from '../componentes/EstadoCarga';
import { MensajeError } from '../componentes/MensajeError';
import { usePeticion } from '../hooks/usePeticion';
import type { EstadoEvaluacion, EvaluacionResponse, PeriodoResponse } from '../tipos';
import { clienteGestion } from './cliente';
import '../evaluacion.css';
import './gestion.css';

type Filtro = '' | EstadoEvaluacion;

const ETIQUETA_ESTADO: Record<EstadoEvaluacion, string> = {
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
};

const cargarPanel = async (estado: Filtro) => {
  const [evaluaciones, periodos] = await Promise.all([
    clienteGestion.listarEvaluaciones(estado ? { estado } : {}),
    clienteGestion.listarPeriodos(),
  ]);
  return { evaluaciones, periodos };
};

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });

function Fila({ e, periodos }: { e: EvaluacionResponse; periodos: PeriodoResponse[] }) {
  const periodo = periodos.find((p) => p.id === e.periodoId);
  return (
    <tr>
      <td className="ev-numero">{e.id}</td>
      <td className="ev-numero">{e.sujetoId}</td>
      <td>{periodo?.codigo ?? `#${e.periodoId}`}</td>
      <td>
        <span className={`ev-estado ev-estado--${e.estado.toLowerCase()}`}>
          {ETIQUETA_ESTADO[e.estado]}
        </span>
      </td>
      <td>{formatearFecha(e.fechaInicio)}</td>
      <td>
        {e.estado === 'EN_CURSO' ? (
          <Link to={`/bfa/evaluaciones/${e.id}`}>Continuar</Link>
        ) : (
          <Link to={`/evaluaciones/${e.id}/resultados`}>Ver resultados</Link>
        )}
      </td>
    </tr>
  );
}

/** GEN-02-FE — Panel del profesional: evaluaciones autorizadas (E22). Ruta: /panel */
export function PanelPagina() {
  const { estado, ejecutar } = usePeticion(cargarPanel);
  const [filtro, setFiltro] = useState<Filtro>('');

  useEffect(() => {
    void ejecutar(filtro);
  }, [ejecutar, filtro]);

  return (
    <div className="ev-pagina">
      <header className="ev-pagina-cabecera">
        <h1>Panel del profesional</h1>
        <p>
          Evaluaciones de su alcance. Continúe las que están en curso o consulte los resultados.
        </p>
      </header>
      <div className="ev-campo gestion-filtro">
        <label htmlFor="panel-estado">Estado</label>
        <select
          id="panel-estado"
          className="ev-input"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
        >
          <option value="">Todos</option>
          <option value="EN_CURSO">En curso</option>
          <option value="FINALIZADA">Finalizada</option>
        </select>
      </div>
      {estado.fase === 'cargando' && <EstadoCarga texto="Cargando evaluaciones…" />}
      {estado.fase === 'error' && (
        <MensajeError error={estado.error} onReintentar={() => void ejecutar(filtro)} />
      )}
      {estado.fase === 'exito' &&
        (estado.datos.evaluaciones.length === 0 ? (
          <p className="ev-ayuda" role="status">
            No hay evaluaciones con este filtro.
          </p>
        ) : (
          <div className="ev-tabla-contenedor">
            <table className="ev-tabla">
              <caption>Evaluaciones</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Sujeto</th>
                  <th scope="col">Período</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Inicio</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {estado.datos.evaluaciones.map((e) => (
                  <Fila key={e.id} e={e} periodos={estado.datos.periodos} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
