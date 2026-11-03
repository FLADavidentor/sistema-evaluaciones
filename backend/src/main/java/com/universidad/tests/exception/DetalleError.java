package com.universidad.tests.exception;

/** Campo inválido dentro de un error de validación. */
public record DetalleError(String campo, String mensaje) {
}
