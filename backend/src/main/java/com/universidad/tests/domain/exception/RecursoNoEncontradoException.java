package com.universidad.tests.domain.exception;

/** El test, la evaluación, el sujeto o el periodo no existe (404). */
public class RecursoNoEncontradoException extends ExcepcionDeDominio {
    public RecursoNoEncontradoException(String codigo, String mensaje) {
        super(codigo, mensaje);
    }
}
