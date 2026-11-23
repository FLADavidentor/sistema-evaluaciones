import './bfa.css';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useBfaApi } from './api/contexto';
import type { TestDetalle } from './api/tipos';
import { normalizarError } from './flujo/controlador';
import { HojaSimple } from './vistas/HojaSimple';
import { formatoTiempo } from './vistas/formato';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; test: TestDetalle };

// Mientras no exista el acceso real (sujeto, periodo y edición llegan de otro módulo),
// la API simulada usa estos valores de ejemplo.
const EJEMPLO = { sujetoId: 25, periodoId: 3, letraInicial: 'M' };

/** Entrada de la batería: muestra el orden y los tiempos que manda el backend y crea la evaluación (E3). */
export function BfaAccesoPagina() {
  const api = useBfaApi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [creando, setCreando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .listarTests()
      .then((tests) => {
        const bfa = tests.find((t) => t.codigo === 'BFA');
        if (!bfa) throw new Error('TEST_NO_ENCONTRADO');
        return api.obtenerTest(bfa.id);
      })
      .then((test) => vigente && setCarga({ estado: 'listo', test }))
      .catch((e) => vigente && setCarga({ estado: 'error', mensaje: normalizarError(e).mensaje }));
    return () => {
      vigente = false;
    };
  }, [api]);

  const numero = (nombre: keyof typeof EJEMPLO) => {
    const valor = Number(params.get(nombre));
    return Number.isInteger(valor) && valor > 0
      ? valor
      : api.simulada
        ? Number(EJEMPLO[nombre])
        : NaN;
  };

  const comenzar = async (test: TestDetalle) => {
    setCreando(true);
    setFallo(null);
    try {
      // `?subpruebas=R1,R2` aplica solo esas subpruebas (aplicación parcial, E3).
      const pedidas = params
        .get('subpruebas')
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const aplicadas = pedidas?.length ? pedidas : test.subpruebas.map((s) => s.codigo);
      const incluyeFv = aplicadas.includes('FV');
      const evaluacion = await api.iniciarEvaluacion({
        testId: test.id,
        versionFormularioId: test.versionFormularioId,
        ...(pedidas?.length ? { subpruebas: pedidas } : {}),
        sujetoId: numero('sujetoId'),
        periodoId: numero('periodoId'),
        ...(incluyeFv
          ? { fluidez: { letraInicial: params.get('letraInicial') ?? EJEMPLO.letraInicial } }
          : {}),
      });
      navigate(`/bfa/evaluaciones/${evaluacion.id}`);
    } catch (e) {
      setFallo(normalizarError(e).mensaje);
      setCreando(false);
    }
  };

  const envoltorio = (hoja: ReactNode) => (
    <div className="app-shell">
      <div className="test-stage">{hoja}</div>
    </div>
  );

  if (carga.estado === 'cargando') {
    return envoltorio(
      <HojaSimple
        nombre="Batería Factorial de Aptitudes"
        etiqueta="Batería"
        titulo="Cargando batería"
      />,
    );
  }
  if (carga.estado === 'error') {
    return envoltorio(
      <HojaSimple
        nombre="Batería Factorial de Aptitudes"
        etiqueta="Error"
        titulo="No se pudo cargar la batería"
        descripcion={carga.mensaje}
        accion={{ texto: 'Reintentar', alPulsar: () => location.reload() }}
      />,
    );
  }

  const { test } = carga;
  return envoltorio(
    <HojaSimple
      nombre={test.nombre}
      etiqueta="Batería"
      titulo={`${test.subpruebas.length} subpruebas, en este orden`}
      descripcion={
        fallo ?? (api.simulada ? 'Datos simulados: todavía no hay backend conectado.' : undefined)
      }
      accion={{
        texto: creando ? 'Creando…' : 'Comenzar evaluación',
        alPulsar: () => !creando && void comenzar(test),
      }}
    >
      <ol className="bfa-orden">
        {[...test.subpruebas]
          .sort((a, b) => a.orden - b.orden)
          .map((s) => (
            <li key={s.codigo}>
              <span>{s.nombre}</span>
              <span className="bfa-orden-tiempo">{formatoTiempo(s.tiempoLimiteSegundos)}</span>
            </li>
          ))}
      </ol>
    </HojaSimple>,
  );
}
