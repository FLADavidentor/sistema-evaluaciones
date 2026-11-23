import { AnswerOption } from '../../../components/AnswerOption';
import { Figura } from '../components/Figura';
import { FluidezVerbal } from '../components/FluidezVerbal';
import { TestScreen } from '../../../components/TestScreen';
import type { TestOption } from '../../../components/AnswerOption';
import type { EjemploPractica } from '../api/tipos';
import type { ControladorBfa, EstadoEjecucion, EstadoFlujo } from '../flujo/controlador';
import { PAUSA_ANTES_DE, presentacionDe } from '../familias';
import { formatoTiempo } from './formato';
import { HojaSimple } from './HojaSimple';

type VistaFlujoProps = {
  estado: EstadoFlujo;
  controlador: ControladorBfa;
  alSalir: () => void;
};

const NOMBRE_TEST = 'Batería Factorial de Aptitudes';

/** El estado del resultado se informa tal como lo devuelve el backend; el navegador no calcula ni publica nada. */
function textoResultado(estadoResultado: string | null): string {
  switch (estadoResultado) {
    case 'PENDIENTE_VALIDACION':
      return 'El resultado está pendiente de validación.';
    case 'CALCULANDO':
      return 'El resultado se está calculando.';
    case 'DISPONIBLE':
      return 'El resultado está disponible.';
    default:
      return estadoResultado ? `Estado del resultado: ${estadoResultado}.` : '';
  }
}

/** Elige la pantalla según la fase oficial del flujo. No decide nada: solo presenta. */
export function VistaFlujo({ estado, controlador, alSalir }: VistaFlujoProps) {
  switch (estado.fase) {
    case 'cargando':
      return (
        <HojaSimple
          nombre={NOMBRE_TEST}
          etiqueta="Evaluación"
          titulo="Cargando evaluación"
          descripcion="Consultando el estado oficial."
        />
      );

    case 'iniciando':
      return (
        <HojaSimple
          nombre={estado.subprueba.nombre}
          etiqueta="Subprueba"
          titulo="Iniciando subprueba"
          descripcion="El tiempo oficial empieza cuando aparezca la primera pregunta."
        />
      );

    case 'error':
      return (
        <HojaSimple
          nombre={NOMBRE_TEST}
          etiqueta="Error"
          titulo="No se pudo continuar"
          descripcion={estado.error.mensaje}
          aviso={{ kind: 'error', message: `Código: ${estado.error.codigo}` }}
          accion={{
            texto: estado.error.reintentable ? 'Reintentar' : 'Salir',
            alPulsar: estado.error.reintentable ? controlador.reintentar : alSalir,
          }}
        />
      );

    case 'preparacion': {
      const { subprueba, paso, posicion, total, contenido } = estado;
      const ejemplo = paso === 'practica' ? contenido?.ejemplos[estado.ejemplo] : undefined;
      if (ejemplo && contenido) {
        return (
          <VistaPractica
            estado={estado}
            ejemplo={ejemplo}
            total={contenido.ejemplos.length}
            controlador={controlador}
          />
        );
      }
      const pres = presentacionDe(subprueba.codigo);
      const progreso = `Subprueba ${posicion} de ${total}. Tiempo oficial: ${formatoTiempo(subprueba.tiempoLimiteSegundos)}, que empieza solo al iniciar.`;
      const texto =
        paso === 'instrucciones'
          ? (contenido?.instrucciones ?? pres.instrucciones)
          : (pres.practica ?? '');
      const hayPractica =
        subprueba.tienePractica && (contenido === null || contenido.ejemplos.length > 0);
      return (
        <TestScreen
          testName={subprueba.nombre}
          questionNumber={0}
          totalQuestions={0}
          timeRemainingSeconds={null}
          prompt=""
          selectedOption={null}
          saveState="saved"
          phase={paso === 'instrucciones' ? 'instructions' : 'practice'}
          phaseTitle={
            paso === 'instrucciones'
              ? `Instrucciones · ${subprueba.nombre}`
              : `Práctica · ${subprueba.nombre}`
          }
          phaseDescription={`${texto} ${progreso}`}
          primaryActionLabel={
            paso === 'instrucciones' && hayPractica
              ? 'Continuar a la práctica'
              : 'Iniciar subprueba'
          }
          onNext={controlador.continuar}
        />
      );
    }

    case 'ejecucion':
      return <VistaEjecucion estado={estado} controlador={controlador} />;

    case 'transicion': {
      if (estado.cerrando) {
        return (
          <HojaSimple
            nombre={estado.cerrada.nombre}
            etiqueta="Tiempo oficial"
            titulo="El tiempo terminó"
            descripcion="No se aceptan más respuestas. Esperando la confirmación oficial del cierre."
          />
        );
      }
      const { siguiente, cerrada } = estado;
      const pausa =
        siguiente?.codigo === PAUSA_ANTES_DE
          ? ' Antes de esta subprueba se permite una pausa de 5 a 10 minutos; el tiempo no corre hasta iniciarla.'
          : '';
      return (
        <HojaSimple
          nombre={cerrada.nombre}
          etiqueta="Subprueba cerrada"
          titulo="El tiempo terminó"
          descripcion={
            siguiente
              ? `${cerrada.nombre} se cerró y no se aceptan más respuestas. Sigue: ${siguiente.nombre}. No se puede volver a la subprueba anterior.${pausa}`
              : `${cerrada.nombre} se cerró y no se aceptan más respuestas. No quedan más subpruebas por aplicar.`
          }
          guardado="saved"
          accion={{
            texto: siguiente ? 'Continuar' : 'Ir al cierre',
            alPulsar: controlador.continuar,
          }}
        />
      );
    }

    case 'listaParaFinalizar':
      if (estado.finalizando) {
        return (
          <HojaSimple
            nombre={NOMBRE_TEST}
            etiqueta="Evaluación"
            titulo="Finalizando evaluación"
            descripcion="Consolidando el cierre."
          />
        );
      }
      return (
        <HojaSimple
          nombre={NOMBRE_TEST}
          etiqueta="Evaluación"
          titulo="Todas las subpruebas están cerradas"
          descripcion="Finaliza la evaluación para registrar el cierre."
          guardado="saved"
          accion={{ texto: 'Finalizar evaluación', alPulsar: controlador.continuar }}
        />
      );

    case 'finalizada':
      return (
        <HojaSimple
          nombre={NOMBRE_TEST}
          etiqueta="Evaluación"
          titulo="Evaluación finalizada"
          descripcion={`La evaluación quedó finalizada. ${textoResultado(estado.estadoResultado)}`}
          guardado="saved"
          accion={{ texto: 'Salir', alPulsar: alSalir }}
        />
      );
  }
}

function VistaEjecucion({
  estado,
  controlador,
}: {
  estado: EstadoEjecucion;
  controlador: ControladorBfa;
}) {
  const { subprueba } = estado;
  const pres = presentacionDe(subprueba.codigo);
  const segundos = controlador.segundosRestantes(estado);
  const aviso = estado.recuperada
    ? { kind: 'warning' as const, message: 'Se recuperó la sesión. El tiempo no se detuvo.' }
    : undefined;

  if (estado.alFinal) {
    return (
      <HojaSimple
        nombre={subprueba.nombre}
        etiqueta="En curso"
        titulo="Respondiste todo lo disponible"
        descripcion="La subprueba se cierra cuando termina el tiempo. Mientras tanto puedes revisar tus respuestas."
        segundos={segundos}
        guardado={estado.guardado}
        accion={{ texto: 'Revisar respuestas', alPulsar: controlador.revisar }}
      />
    );
  }

  if (subprueba.tipoRespuesta === 'TEXTO_LIBRE') {
    return (
      <TestScreen
        testName={subprueba.nombre}
        questionNumber={1}
        totalQuestions={1}
        questionLabel={`Hasta ${subprueba.maximoEntradas ?? 0} palabras`}
        timeRemainingSeconds={segundos}
        prompt="Escribe palabras con la letra asignada"
        selectedOption={null}
        saveState={estado.guardado}
        notice={aviso}
        responseArea={
          <FluidezVerbal
            letra={estado.letraInicial ?? ''}
            maxEntradas={subprueba.maximoEntradas ?? 75}
            palabras={estado.palabras}
            onChange={controlador.escribirPalabras}
          />
        }
        primaryActionLabel="Listo"
        onNext={controlador.siguiente}
      />
    );
  }

  const pregunta = estado.preguntas[estado.indice];
  const opciones: TestOption[] = pregunta.opciones.map((o) => ({
    id: o.letra,
    label: pres.renderOpcion ? pres.renderOpcion(o.texto) : o.texto,
    figure: o.recursoUrl ? <Figura rol="opcion" src={o.recursoUrl} alt="" /> : undefined,
  }));
  const total = subprueba.numeroPreguntas;
  // La hoja puede numerar distinto (VOC2: 41–77): solo se muestra «de N» si la numeración es corrida.
  const consecutiva = pregunta.numero === estado.indice + 1 && total > 0;
  const ultima = estado.indice >= estado.preguntas.length - 1;

  return (
    <TestScreen
      testName={subprueba.nombre}
      questionNumber={pregunta.numero}
      totalQuestions={total}
      questionLabel={consecutiva ? undefined : `Pregunta ${pregunta.numero}`}
      timeRemainingSeconds={segundos}
      prompt={pres.renderEnunciado ? pres.renderEnunciado(pregunta.enunciado) : pregunta.enunciado}
      promptVariant={pres.promptVariant}
      optionsLayout={pres.optionsLayout}
      numeric={pres.numeric}
      options={opciones}
      questionResource={
        pregunta.recursoUrl ? (
          <Figura rol="estimulo" src={pregunta.recursoUrl} alt="Figura del ítem" />
        ) : undefined
      }
      selectedOption={estado.respuestas[pregunta.id] ?? null}
      saveState={estado.guardado}
      notice={aviso}
      primaryActionLabel={ultima ? 'Listo' : 'Siguiente'}
      onPrevious={pres.volverAtras && estado.indice > 0 ? controlador.anterior : undefined}
      onSelect={(letra) => controlador.seleccionar(pregunta.id, letra)}
      onNext={controlador.siguiente}
    />
  );
}

type EstadoPreparacion = Extract<EstadoFlujo, { fase: 'preparacion' }>;

/** Ejemplo de práctica de E24: no consume tiempo, no se guarda y no cuenta para el puntaje. */
function VistaPractica({
  estado,
  ejemplo,
  total,
  controlador,
}: {
  estado: EstadoPreparacion;
  ejemplo: EjemploPractica;
  total: number;
  controlador: ControladorBfa;
}) {
  const ultimo = estado.ejemplo >= total - 1;
  return (
    <HojaSimple
      nombre={estado.subprueba.nombre}
      etiqueta={`Práctica ${estado.ejemplo + 1} de ${total}`}
      titulo={ejemplo.enunciado}
      descripcion="Este ejemplo no consume tiempo oficial ni cuenta para el puntaje."
      aviso={estado.seleccion ? { kind: 'warning', message: ejemplo.retroalimentacion } : undefined}
      accion={{
        texto: ultimo ? 'Iniciar subprueba' : 'Siguiente ejemplo',
        alPulsar: controlador.continuar,
      }}
    >
      {ejemplo.opciones.length > 0 && (
        <div className="options" role="radiogroup" aria-label="Alternativas del ejemplo">
          {ejemplo.opciones.map((o) => (
            <AnswerOption
              key={o.letra}
              groupName={`practica-${estado.subprueba.codigo}-${ejemplo.numero}`}
              option={{ id: o.letra, label: o.texto }}
              checked={estado.seleccion === o.letra}
              onChange={controlador.seleccionarPractica}
            />
          ))}
        </div>
      )}
    </HojaSimple>
  );
}
