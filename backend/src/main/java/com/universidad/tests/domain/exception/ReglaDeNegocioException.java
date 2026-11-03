package com.universidad.tests.domain.exception;

/** Datos con formato correcto que violan una regla de negocio (422). */
public class ReglaDeNegocioException extends ExcepcionDeDominio {
    public ReglaDeNegocioException(String codigo, String mensaje) {
        super(codigo, mensaje);
    }
}
