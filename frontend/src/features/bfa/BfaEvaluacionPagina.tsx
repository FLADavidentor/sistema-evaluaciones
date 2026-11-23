import './bfa.css';
import { useEffect, useMemo, useReducer, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useBfaApi } from './api/contexto';
import { ControladorBfa } from './flujo/controlador';
import { HojaSimple } from './vistas/HojaSimple';
import { VistaFlujo } from './vistas/VistaFlujo';

/** Ejecuta la batería BFA: `/bfa/evaluaciones/:evaluacionId`. Retomar tras una caída es abrir la misma URL. */
export function BfaEvaluacionPagina() {
  const { evaluacionId } = useParams();
  const id = Number(evaluacionId);
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="app-shell">
        <div className="test-stage">
          <HojaSimple
            nombre="Batería Factorial de Aptitudes"
            etiqueta="Error"
            titulo="Evaluación no válida"
            descripcion="La dirección no corresponde a una evaluación."
          />
        </div>
      </div>
    );
  }
  return <Ejecucion evaluacionId={id} />;
}

function Ejecucion({ evaluacionId }: { evaluacionId: number }) {
  const api = useBfaApi();
  const navigate = useNavigate();
  const controlador = useMemo(() => new ControladorBfa(api, evaluacionId), [api, evaluacionId]);
  const estado = useSyncExternalStore(controlador.suscribir, controlador.obtenerEstado);
  // Refresca la pantalla cada segundo; el tiempo restante lo calcula el controlador.
  const [, refrescar] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    void controlador.cargar();
    return () => controlador.detener();
  }, [controlador]);

  useEffect(() => {
    const reloj = setInterval(() => {
      refrescar();
      controlador.tick();
    }, 1000);
    return () => clearInterval(reloj);
  }, [controlador]);

  return (
    <div className="app-shell">
      <div className="test-stage">
        <VistaFlujo estado={estado} controlador={controlador} alSalir={() => navigate('/')} />
      </div>
    </div>
  );
}
