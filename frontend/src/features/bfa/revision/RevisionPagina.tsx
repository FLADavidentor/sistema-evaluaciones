import { useId, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { TestNotice } from '../../../components/TestNotice';
import { EstadoCarga } from '../../evaluacion/componentes/EstadoCarga';
import { MensajeError } from '../../evaluacion/componentes/MensajeError';
import { Insignia } from '../../resultados/componentes/Insignia';
import '../../evaluacion/evaluacion.css';
import '../../resultados/resultados.css';
import { useBfaApi } from '../api/contexto';
import { clienteRevisionPara } from './cliente';
import { AUDIENCIAS, contarDecisiones, motivoValido, puedePublicar, yaPublicada } from './logica';
import './revision.css';
import type { ClienteRevision, DecisionPalabra } from './tipos';
import { useRevision } from './useRevision';

const ETIQUETA: Record<DecisionPalabra, { texto: string; tono: 'exito' | 'aviso' | 'neutro' }> = {
  VALIDA: { texto: 'Aceptada', tono: 'exito' },
  INVALIDA: { texto: 'Rechazada', tono: 'aviso' },
  PENDIENTE: { texto: 'Pendiente', tono: 'neutro' },
};

/** BFA-FE-09: revisión profesional de Fluidez Verbal en `/evaluaciones/:evaluacionId/revision`. */
export function RevisionPagina() {
  const { evaluacionId } = useParams();
  const api = useBfaApi();
  const cliente = useMemo(() => clienteRevisionPara(api), [api]);
  const id = Number(evaluacionId);
  return (
    <div className="ev-pagina">
      <header className="ev-pagina-cabecera">
        <h1>Revisión de Fluidez Verbal</h1>
        <p>Decida cada palabra, recalcule si hace falta y publique la revisión como vigente.</p>
      </header>
      <div className="ev-panel">
        {Number.isInteger(id) && id > 0 ? (
          <Revision key={id} cliente={cliente} evaluacionId={id} simulada={!!api.simulada} />
        ) : (
          <TestNotice kind="error" message="La dirección no corresponde a una evaluación." />
        )}
      </div>
    </div>
  );
}

function Revision({
  cliente,
  evaluacionId,
  simulada,
}: {
  cliente: ClienteRevision;
  evaluacionId: number;
  simulada: boolean;
}) {
  const r = useRevision(cliente, evaluacionId);
  const base = useId();
  const [motivos, setMotivos] = useState<Record<number, string>>({});
  const [motivoRecalculo, setMotivoRecalculo] = useState('');
  const [motivoPublicacion, setMotivoPublicacion] = useState('');
  const [audiencia, setAudiencia] = useState<string[]>(['SUJETO', 'PSICOLOGO']);

  if (r.carga.fase === 'cargando') return <EstadoCarga texto="Cargando la revisión…" />;
  if (r.carga.fase === 'error')
    return <MensajeError error={r.carga.error} onReintentar={() => void r.recargar()} />;

  const datos = r.carga.datos;
  const conteo = contarDecisiones(datos.palabras);
  const publicada = yaPublicada(datos);
  const sinRevision = datos.calificacionId === null;

  const decidir = async (respuestaId: number, decision: DecisionPalabra) => {
    if (await r.revisar(respuestaId, decision, motivos[respuestaId] ?? ''))
      setMotivos((m) => ({ ...m, [respuestaId]: '' }));
  };

  return (
    <div className="rev">
      {simulada && (
        <TestNotice
          kind="warning"
          message="Datos simulados: las decisiones solo viven en esta sesión del navegador."
        />
      )}
      <p className="rev-resumen">
        Evaluación {evaluacionId} · Revisión candidata: {datos.revision ?? 'sin crear'} · Vigente:{' '}
        {datos.revisionVigente ?? 'ninguna'}
      </p>
      {r.aviso && (
        <p role="status" className="rev-aviso">
          {r.aviso}
        </p>
      )}
      {r.errorAccion && <MensajeError error={r.errorAccion} />}

      <section aria-labelledby={`${base}-palabras`}>
        <h2 id={`${base}-palabras`}>Palabras de Fluidez Verbal</h2>
        <p role="status" className="rev-conteo">
          <Insignia texto={`${conteo.aceptadas} aceptadas`} tono="exito" />
          <Insignia texto={`${conteo.rechazadas} rechazadas`} tono="aviso" />
          <Insignia texto={`${conteo.pendientes} pendientes`} tono="neutro" />
        </p>
        {sinRevision && (
          <TestNotice
            kind="warning"
            message="Aún no hay una revisión candidata: cree una con «Recalcular» para registrar decisiones."
          />
        )}
        {publicada && (
          <TestNotice
            kind="warning"
            message="Esta revisión ya es la vigente. Para cambiar una decisión, recalcule y cree una nueva revisión."
          />
        )}
        {datos.palabras.length === 0 ? (
          <p>Esta evaluación no tiene palabras de Fluidez Verbal registradas.</p>
        ) : (
          <ul className="rev-lista">
            {datos.palabras.map((p) => {
              const campo = `${base}-m-${p.respuestaId}`;
              const motivo = motivos[p.respuestaId] ?? '';
              const bloqueado = r.ocupado || publicada || sinRevision;
              const sinMotivo = !motivoValido(motivo);
              return (
                <li key={p.respuestaId} className="rev-palabra">
                  <div className="rev-palabra-datos">
                    <strong>
                      {p.ordenEntrada}. {p.texto}
                    </strong>
                    <Insignia {...ETIQUETA[p.decision]} />
                    {p.motivo && <span className="ev-ayuda">Motivo: {p.motivo}</span>}
                  </div>
                  <div className="ev-fila">
                    <label htmlFor={campo} className="visually-hidden">
                      Motivo para la palabra {p.texto}
                    </label>
                    <input
                      id={campo}
                      className="ev-input"
                      placeholder="Motivo de la decisión"
                      value={motivo}
                      disabled={bloqueado}
                      onChange={(e) =>
                        setMotivos((m) => ({ ...m, [p.respuestaId]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="ev-boton"
                      disabled={bloqueado || sinMotivo}
                      onClick={() => void decidir(p.respuestaId, 'VALIDA')}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="ev-boton ev-boton--secundario"
                      disabled={bloqueado || sinMotivo}
                      onClick={() => void decidir(p.respuestaId, 'INVALIDA')}
                    >
                      Rechazar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${base}-recalculo`} className="rev-bloque">
        <h2 id={`${base}-recalculo`}>Recalcular</h2>
        <div className="ev-fila">
          <label htmlFor={`${base}-mr`} className="visually-hidden">
            Motivo del recálculo
          </label>
          <input
            id={`${base}-mr`}
            className="ev-input"
            placeholder="Motivo del recálculo (obligatorio)"
            value={motivoRecalculo}
            disabled={r.ocupado}
            onChange={(e) => setMotivoRecalculo(e.target.value)}
          />
          <button
            type="button"
            className="ev-boton ev-boton--secundario"
            disabled={r.ocupado || !motivoValido(motivoRecalculo)}
            onClick={async () => {
              if (await r.recalcular(motivoRecalculo.trim())) setMotivoRecalculo('');
            }}
          >
            Recalcular
          </button>
        </div>
        <p className="ev-ayuda">Crea una nueva revisión; la vigente no cambia hasta publicar.</p>
      </section>

      <section aria-labelledby={`${base}-publicar`} className="rev-bloque">
        <h2 id={`${base}-publicar`}>Validar y publicar</h2>
        <fieldset className="ev-fieldset">
          <legend>Audiencia de la revisión publicada</legend>
          <div className="rev-audiencia">
            {AUDIENCIAS.map((a) => (
              <label key={a.valor}>
                <input
                  type="checkbox"
                  checked={audiencia.includes(a.valor)}
                  disabled={r.ocupado || publicada}
                  onChange={(e) =>
                    setAudiencia((v) =>
                      e.target.checked ? [...v, a.valor] : v.filter((x) => x !== a.valor),
                    )
                  }
                />{' '}
                {a.etiqueta}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="ev-fila">
          <label htmlFor={`${base}-mp`} className="visually-hidden">
            Motivo de la publicación
          </label>
          <input
            id={`${base}-mp`}
            className="ev-input"
            placeholder="Motivo de la publicación (obligatorio)"
            value={motivoPublicacion}
            disabled={r.ocupado || publicada}
            onChange={(e) => setMotivoPublicacion(e.target.value)}
          />
          <button
            type="button"
            className="ev-boton"
            disabled={
              r.ocupado ||
              !puedePublicar(datos) ||
              !motivoValido(motivoPublicacion) ||
              audiencia.length === 0
            }
            onClick={() => void r.publicar(motivoPublicacion.trim(), audiencia)}
          >
            Validar y publicar como vigente
          </button>
        </div>
        {conteo.pendientes > 0 && (
          <p className="ev-ayuda">Decida todas las palabras pendientes para poder publicar.</p>
        )}
      </section>

      <p>
        <Link to={`/evaluaciones/${evaluacionId}/resultados`}>Ver resultados de la evaluación</Link>
      </p>
    </div>
  );
}
