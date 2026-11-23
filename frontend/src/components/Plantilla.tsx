import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { enlacesPorRol } from '../features/acceso/navegacion';
import { useSesion } from '../features/acceso/sesion';
import { ETIQUETAS_ROL } from '../features/acceso/tipos';
import '../features/acceso/acceso.css';

// Durante la aplicación la persona evaluada no ve la navegación (no debe llegar a resultados).
const RUTAS_APLICACION = [
  /^\/bfa\/evaluaciones\/[^/]+$/,
  /^\/weill\/intentos\/[^/]+(\/constancia)?$/,
];

/** Marco común de todas las páginas, con la navegación principal. */
export function Plantilla() {
  const { pathname } = useLocation();
  const { sesion, cerrar } = useSesion();
  const navegar = useNavigate();
  const enAplicacion = RUTAS_APLICACION.some((ruta) => ruta.test(pathname));
  return (
    <>
      {!enAplicacion && (
        <nav className="app-nav" aria-label="Navegación principal">
          {enlacesPorRol(sesion?.rolActivo ?? null).map((enlace) => (
            <NavLink key={enlace.a} to={enlace.a} end={enlace.exacto}>
              {enlace.texto}
            </NavLink>
          ))}
          {sesion ? (
            <div className="app-nav-usuario">
              <span>{sesion.correo}</span>
              <span className="app-nav-rol">{ETIQUETAS_ROL[sesion.rolActivo]}</span>
              <button
                type="button"
                className="app-nav-salir"
                onClick={() => void cerrar().finally(() => void navegar('/acceso'))}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="app-nav-usuario">
              <NavLink to="/acceso">Iniciar sesión</NavLink>
            </div>
          )}
        </nav>
      )}
      <main className="app">
        <Outlet />
      </main>
    </>
  );
}
