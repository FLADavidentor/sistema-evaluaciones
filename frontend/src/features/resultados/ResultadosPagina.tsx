import { useMemo } from 'react';
import { useParams } from 'react-router';
import '../evaluacion/evaluacion.css';
import '../bfa/perfil/perfil.css';
import { useBfaApi } from '../bfa/api/contexto';
import { PerfilBfa } from '../bfa/perfil/componentes/PerfilBfa';
import { esResultadoBfa } from '../bfa/perfil/presentacionPerfil';
import { crearClienteResultadosBfa } from '../bfa/perfil/resultadosSimulados';
import { clienteResultados, usaMocksResultados } from './cliente';
import { ConsultaResultados } from './componentes/ConsultaResultados';
import type { ResultadoResponse } from './tipos';
import './resultados.css';

/** BFA-FE-08: un resultado BFA se presenta con su perfil; el resto con la vista general. */
const vistaPorTest = (resultado: ResultadoResponse, datosSimulados: boolean) =>
  esResultadoBfa(resultado.factores) ? (
    <PerfilBfa resultado={resultado} datosSimulados={datosSimulados} />
  ) : null;

/** GEN-05-FE: consulta general de resultados (E9). Sirve para cualquier test. */
export function ResultadosPagina() {
  const { evaluacionId } = useParams();
  const bfaApi = useBfaApi();
  // Con mocks, las evaluaciones creadas en la API simulada de BFA tienen su propio E9 simulado.
  const cliente = useMemo(
    () =>
      usaMocksResultados && bfaApi.simulada
        ? crearClienteResultadosBfa(bfaApi, clienteResultados)
        : undefined,
    [bfaApi],
  );
  return (
    <div className="ev-pagina">
      <header className="ev-pagina-cabecera">
        <h1>Resultados de evaluación</h1>
        <p>Consulte el estado y la revisión vigente publicada de una evaluación finalizada.</p>
      </header>
      <div className="ev-panel">
        {/* key: si cambia el ID de la ruta se reinicia la consulta. */}
        <ConsultaResultados
          key={evaluacionId ?? ''}
          evaluacionIdInicial={evaluacionId}
          cliente={cliente}
          datosSimulados={usaMocksResultados}
          vista={vistaPorTest}
        />
      </div>
    </div>
  );
}
