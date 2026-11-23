import { PeriodosSeccion } from './PeriodosSeccion';
import { SujetosSeccion } from './SujetosSeccion';
import '../evaluacion.css';
import './gestion.css';

/** GEN-02-FE — Alta y búsqueda de sujetos (E18/E19/E23), períodos (E20/E21). Ruta: /gestion */
export function GestionPagina() {
  return (
    <div className="ev-pagina">
      <header className="ev-pagina-cabecera">
        <h1>Sujetos y períodos</h1>
        <p>Registre a las personas evaluadas y los períodos de aplicación.</p>
      </header>
      <SujetosSeccion />
      <PeriodosSeccion />
    </div>
  );
}
