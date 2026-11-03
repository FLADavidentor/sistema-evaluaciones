package com.universidad.tests.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/** Cuerpo único de toda respuesta de error (Documento general §5.2.2). */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String codigo,
        String mensaje,
        String ruta,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<DetalleError> detalles) {

    public static ErrorResponse de(int status, String codigo, String mensaje, String ruta, List<DetalleError> detalles) {
        return new ErrorResponse(Instant.now(), status, codigo, mensaje, ruta, detalles);
    }
}
