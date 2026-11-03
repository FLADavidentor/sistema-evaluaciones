package com.universidad.tests.domain.exception;

/** La acción no es válida en el estado actual (409). */
public class EstadoNoValidoException extends ExcepcionDeDominio {
    public EstadoNoValidoException(String codigo, String mensaje) {
        super(codigo, mensaje);
    }
}
