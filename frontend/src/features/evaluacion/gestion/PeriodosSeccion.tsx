import { useEffect, useState, type FormEvent } from 'react';
import { Campo } from '../../acceso/Campo';
import { EstadoCarga } from '../componentes/EstadoCarga';
import { ErrorCampo } from '../componentes/ErrorCampo';
import { MensajeError } from '../componentes/MensajeError';
import { usePeticion } from '../hooks/usePeticion';
import { clienteGestion } from './cliente';
import type { PeriodoRequest } from './tipos';
import { validarPeriodo, type Errores } from './validaciones';

const VACIO: PeriodoRequest = { codigo: '', denominacion: '', inicio: '', fin: '' };

/** Listado (E21) y creación (E20) de períodos. */
export function PeriodosSeccion() {
  const lista = usePeticion(clienteGestion.listarPeriodos);
  const alta = usePeticion(clienteGestion.crearPeriodo);
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState<Errores<PeriodoRequest>>({});
  const { ejecutar: cargarLista } = lista;
  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  const cambiar = (campo: keyof PeriodoRequest) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    const encontrados = validarPeriodo(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0 || alta.estado.fase === 'cargando') return;
    const creado = await alta.ejecutar({ ...valores, codigo: valores.codigo.trim() });
    if (creado) {
      setValores(VACIO);
      void cargarLista();
    }
  };

  return (
    <section className="ev-panel" aria-labelledby="gestion-periodos">
      <h2 id="gestion-periodos">Períodos</h2>
      {lista.estado.fase === 'cargando' && <EstadoCarga texto="Cargando períodos…" />}
      {lista.estado.fase === 'error' && (
        <MensajeError error={lista.estado.error} onReintentar={() => void cargarLista()} />
      )}
      {lista.estado.fase === 'exito' &&
        (lista.estado.datos.length === 0 ? (
          <p className="ev-ayuda">No hay períodos registrados.</p>
        ) : (
          <div className="ev-tabla-contenedor">
            <table className="ev-tabla">
              <caption>Períodos autorizados</caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Denominación</th>
                  <th scope="col">Inicio</th>
                  <th scope="col">Fin</th>
                  <th scope="col">Nuevas asignaciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.estado.datos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.codigo}</td>
                    <td>{p.denominacion}</td>
                    <td>{p.inicio ?? '—'}</td>
                    <td>{p.fin ?? '—'}</td>
                    <td>{p.disponible ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <form className="ev-form gestion-aparte" onSubmit={(e) => void crear(e)} noValidate>
        <h3>Crear período</h3>
        <Campo
          etiqueta="Código"
          placeholder="2027-2"
          value={valores.codigo}
          onChange={cambiar('codigo')}
          aria-invalid={!!errores.codigo}
        />
        <ErrorCampo id="err-codigo" mensaje={errores.codigo} />
        <Campo
          etiqueta="Denominación"
          value={valores.denominacion}
          onChange={cambiar('denominacion')}
          aria-invalid={!!errores.denominacion}
        />
        <ErrorCampo id="err-denominacion" mensaje={errores.denominacion} />
        <Campo
          etiqueta="Inicio"
          type="date"
          value={valores.inicio}
          onChange={cambiar('inicio')}
          aria-invalid={!!errores.inicio}
        />
        <ErrorCampo id="err-inicio" mensaje={errores.inicio} />
        <Campo
          etiqueta="Fin"
          type="date"
          value={valores.fin}
          onChange={cambiar('fin')}
          aria-invalid={!!errores.fin}
        />
        <ErrorCampo id="err-fin" mensaje={errores.fin} />
        {alta.estado.fase === 'error' && <MensajeError error={alta.estado.error} />}
        {alta.estado.fase === 'cargando' && <EstadoCarga texto="Creando…" />}
        {alta.estado.fase === 'exito' && (
          <p className="ev-confirmado" role="status">
            Período {alta.estado.datos.codigo} creado.
          </p>
        )}
        <div className="ev-acciones">
          <button type="submit" className="ev-boton" disabled={alta.estado.fase === 'cargando'}>
            Crear período
          </button>
        </div>
      </form>
    </section>
  );
}
