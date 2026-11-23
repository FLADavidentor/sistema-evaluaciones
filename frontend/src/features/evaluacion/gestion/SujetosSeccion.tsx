import { useState, type FormEvent } from 'react';
import { Campo } from '../../acceso/Campo';
import { EstadoCarga } from '../componentes/EstadoCarga';
import { ErrorCampo } from '../componentes/ErrorCampo';
import { MensajeError } from '../componentes/MensajeError';
import { usePeticion } from '../hooks/usePeticion';
import { clienteGestion } from './cliente';
import type { SujetoRequest } from './tipos';
import { validarSujeto, type Errores } from './validaciones';

const VACIO: SujetoRequest = {
  identificadorInstitucional: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
};

/** Búsqueda (E23) y alta (E18) de la persona evaluada. */
export function SujetosSeccion() {
  const busqueda = usePeticion(clienteGestion.buscarSujeto);
  const alta = usePeticion(clienteGestion.registrarSujeto);
  const [consulta, setConsulta] = useState('');
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState<Errores<SujetoRequest>>({});
  const cambiar = (campo: keyof SujetoRequest) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  const buscar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (consulta.trim()) await busqueda.ejecutar(consulta.trim());
  };

  const registrar = async (evento: FormEvent) => {
    evento.preventDefault();
    const encontrados = validarSujeto(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0 || alta.estado.fase === 'cargando') return;
    const { fechaNacimiento, ...resto } = valores;
    const creado = await alta.ejecutar(fechaNacimiento ? { ...resto, fechaNacimiento } : resto);
    if (creado) setValores(VACIO);
  };

  return (
    <section className="ev-panel" aria-labelledby="gestion-sujetos">
      <h2 id="gestion-sujetos">Sujetos</h2>

      <form className="ev-form" onSubmit={(e) => void buscar(e)} noValidate>
        <Campo
          etiqueta="Buscar por identificador institucional"
          placeholder="2026-0153"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
        />
        <div className="ev-acciones">
          <button
            type="submit"
            className="ev-boton ev-boton--secundario"
            disabled={busqueda.estado.fase === 'cargando' || !consulta.trim()}
          >
            Buscar
          </button>
        </div>
      </form>
      {busqueda.estado.fase === 'cargando' && <EstadoCarga texto="Buscando…" />}
      {busqueda.estado.fase === 'error' && <MensajeError error={busqueda.estado.error} />}
      {busqueda.estado.fase === 'exito' &&
        (busqueda.estado.datos.length === 0 ? (
          <p className="ev-ayuda" role="status">
            No hay una persona con ese identificador. Puede registrarla abajo.
          </p>
        ) : (
          <ul role="status">
            {busqueda.estado.datos.map((s) => (
              <li key={s.id}>
                <strong>
                  {s.nombres} {s.apellidos}
                </strong>{' '}
                · {s.identificadorInstitucional} · ID {s.id}
              </li>
            ))}
          </ul>
        ))}

      <form className="ev-form gestion-aparte" onSubmit={(e) => void registrar(e)} noValidate>
        <h3>Registrar persona evaluada</h3>
        <Campo
          etiqueta="Identificador institucional"
          value={valores.identificadorInstitucional}
          onChange={cambiar('identificadorInstitucional')}
          aria-invalid={!!errores.identificadorInstitucional}
        />
        <ErrorCampo id="err-identificador" mensaje={errores.identificadorInstitucional} />
        <Campo
          etiqueta="Nombres"
          value={valores.nombres}
          onChange={cambiar('nombres')}
          aria-invalid={!!errores.nombres}
        />
        <ErrorCampo id="err-nombres" mensaje={errores.nombres} />
        <Campo
          etiqueta="Apellidos"
          value={valores.apellidos}
          onChange={cambiar('apellidos')}
          aria-invalid={!!errores.apellidos}
        />
        <ErrorCampo id="err-apellidos" mensaje={errores.apellidos} />
        <Campo
          etiqueta="Fecha de nacimiento (solo si la aplicación la requiere)"
          type="date"
          value={valores.fechaNacimiento ?? ''}
          onChange={cambiar('fechaNacimiento')}
        />
        {alta.estado.fase === 'error' && <MensajeError error={alta.estado.error} />}
        {alta.estado.fase === 'cargando' && <EstadoCarga texto="Registrando…" />}
        {alta.estado.fase === 'exito' && (
          <p className="ev-confirmado" role="status">
            Registrado: {alta.estado.datos.nombres} {alta.estado.datos.apellidos} (ID{' '}
            {alta.estado.datos.id}).
          </p>
        )}
        <div className="ev-acciones">
          <button type="submit" className="ev-boton" disabled={alta.estado.fase === 'cargando'}>
            Registrar
          </button>
        </div>
      </form>
    </section>
  );
}
