import { useCallback, useEffect, useRef, useState } from 'react';
import { aErrorMostrable } from '../../evaluacion/mensajesError';
import type { ErrorMostrable } from '../../evaluacion/tipos';
import type { BorradorRevision, ClienteRevision, DecisionPalabra } from './tipos';

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ErrorMostrable }
  | { fase: 'listo'; datos: BorradorRevision };

/** Carga la revisión y aplica E10, E11 y E12 sin recargar: el estado sale de cada respuesta. */
export function useRevision(cliente: ClienteRevision, evaluacionId: number) {
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<ErrorMostrable | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const contador = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++contador.current;
    setCarga({ fase: 'cargando' });
    try {
      const datos = await cliente.cargar(evaluacionId);
      if (id === contador.current) setCarga({ fase: 'listo', datos });
    } catch (e) {
      if (id === contador.current) setCarga({ fase: 'error', error: aErrorMostrable(e) });
    }
  }, [cliente, evaluacionId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const datos = carga.fase === 'listo' ? carga.datos : null;

  /** Ejecuta una acción y, si sale bien, actualiza el estado local con `aplicar`. */
  async function accion<T>(
    operacion: () => Promise<T>,
    aplicar: (anterior: BorradorRevision, respuesta: T) => BorradorRevision,
    mensaje: string,
  ) {
    if (!datos) return false;
    setOcupado(true);
    setErrorAccion(null);
    setAviso(null);
    try {
      const respuesta = await operacion();
      setCarga({ fase: 'listo', datos: aplicar(datos, respuesta) });
      setAviso(mensaje);
      return true;
    } catch (e) {
      setErrorAccion(aErrorMostrable(e));
      return false;
    } finally {
      setOcupado(false);
    }
  }

  return {
    carga,
    ocupado,
    errorAccion,
    aviso,
    recargar: cargar,
    revisar: (respuestaId: number, decision: DecisionPalabra, motivo: string) =>
      accion(
        () =>
          cliente.revisarPalabra(evaluacionId, datos?.calificacionId ?? 0, respuestaId, {
            decision,
            motivo,
          }),
        (b) => ({
          ...b,
          palabras: b.palabras.map((p) =>
            p.respuestaId === respuestaId ? { ...p, decision, motivo: motivo.trim() } : p,
          ),
        }),
        'Decisión registrada.',
      ),
    recalcular: (motivo: string) =>
      accion(
        () =>
          cliente.recalcular(evaluacionId, {
            motivo,
            idSolicitud: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }),
        (b, r) => ({ ...b, calificacionId: r.calificacionId, revision: r.revision }),
        'Se creó una nueva revisión.',
      ),
    publicar: (motivo: string, audiencia: string[]) =>
      accion(
        () =>
          cliente.publicar(evaluacionId, {
            calificacionId: datos?.calificacionId ?? 0,
            motivo,
            revisionVigenteEsperada: datos?.revisionVigente ?? null,
            audiencia,
          }),
        (b, r) => ({ ...b, calificacionId: r.calificacionId, revisionVigente: r.revision }),
        'Revisión publicada como vigente.',
      ),
  };
}
