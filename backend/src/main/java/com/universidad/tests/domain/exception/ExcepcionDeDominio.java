package com.universidad.tests.domain.exception;

/** Base de los errores de negocio. El código es estable para que el frontend decida por él (Documento general §5.2.2). */
public abstract class ExcepcionDeDominio extends RuntimeException {
    private final String codigo;

    protected ExcepcionDeDominio(String codigo, String mensaje) {
        super(mensaje);
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }
}
