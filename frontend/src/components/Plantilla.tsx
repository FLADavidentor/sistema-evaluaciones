import { NavLink, Outlet } from 'react-router';

/** Marco común de todas las páginas, con la navegación principal. */
export function Plantilla() {
  return (
    <>
      <nav className="app-nav" aria-label="Navegación principal">
        <NavLink to="/" end>
          Catálogo
        </NavLink>
        <NavLink to="/resultados">Resultados</NavLink>
      </nav>
      <main className="app">
        <Outlet />
      </main>
    </>
  );
}
