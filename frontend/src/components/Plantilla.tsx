import { NavLink, Outlet, useLocation } from 'react-router';

// Durante la aplicación la persona evaluada no ve la navegación (no debe llegar a resultados).
const RUTAS_APLICACION = [
  /^\/bfa\/evaluaciones\/[^/]+$/,
  /^\/weill\/intentos\/[^/]+(\/constancia)?$/,
];

/** Marco común de todas las páginas, con la navegación principal. */
export function Plantilla() {
  const { pathname } = useLocation();
  const enAplicacion = RUTAS_APLICACION.some((ruta) => ruta.test(pathname));
  return (
    <>
      {!enAplicacion && (
        <nav className="app-nav" aria-label="Navegación principal">
          <NavLink to="/" end>
            Catálogo
          </NavLink>
          <NavLink to="/resultados">Resultados</NavLink>
        </nav>
      )}
      <main className="app">
        <Outlet />
      </main>
    </>
  );
}
