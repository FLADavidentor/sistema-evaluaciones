import { useState } from 'react';
import { aErrorMostrable } from '../evaluacion/mensajesError';
import type { ErrorMostrable } from '../evaluacion/tipos';

interface EstadoEnvio {
  pendiente: boolean;
  error?: ErrorMostrable;
  ok?: string;
}

/** Ejecuta una llamada de escritura y conserva su resultado: mensaje de éxito o error del contrato. */
export function useEnvio() {
  const [estado, setEstado] = useState<EstadoEnvio>({ pendiente: false });
  const enviar = async (llamada: () => Promise<string>): Promise<boolean> => {
    setEstado({ pendiente: true });
    try {
      setEstado({ pendiente: false, ok: await llamada() });
      return true;
    } catch (error) {
      setEstado({ pendiente: false, error: aErrorMostrable(error) });
      return false;
    }
  };
  return { estado, enviar, limpiar: () => setEstado({ pendiente: false }) };
}
