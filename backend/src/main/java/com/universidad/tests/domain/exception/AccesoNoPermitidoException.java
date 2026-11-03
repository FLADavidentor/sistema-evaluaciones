package com.universidad.tests.domain.exception;

/** El usuario no puede ver ese recurso (403). */
public class AccesoNoPermitidoException extends ExcepcionDeDominio {
    public AccesoNoPermitidoException(String codigo, String mensaje) {
        super(codigo, mensaje);
    }
}
