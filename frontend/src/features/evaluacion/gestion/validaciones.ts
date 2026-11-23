import type { PeriodoRequest, SujetoRequest } from './tipos';

export type Errores<T> = Partial<Record<keyof T, string>>;

const FALTA = 'Es obligatorio.';

/** Validación previa al envío; el servidor repite las reglas (E18). */
export function validarSujeto(v: SujetoRequest): Errores<SujetoRequest> {
  const errores: Errores<SujetoRequest> = {};
  if (!v.identificadorInstitucional.trim()) errores.identificadorInstitucional = FALTA;
  if (!v.nombres.trim()) errores.nombres = FALTA;
  if (!v.apellidos.trim()) errores.apellidos = FALTA;
  return errores;
}

/** Validación previa al envío (E20). Las fechas son AAAA-MM-DD, comparables como texto. */
export function validarPeriodo(v: PeriodoRequest): Errores<PeriodoRequest> {
  const errores: Errores<PeriodoRequest> = {};
  if (!v.codigo.trim()) errores.codigo = FALTA;
  if (!v.denominacion.trim()) errores.denominacion = FALTA;
  if (!v.inicio) errores.inicio = FALTA;
  if (!v.fin) errores.fin = FALTA;
  if (v.inicio && v.fin && v.inicio > v.fin)
    errores.fin = 'El fin no puede ser anterior al inicio.';
  return errores;
}
