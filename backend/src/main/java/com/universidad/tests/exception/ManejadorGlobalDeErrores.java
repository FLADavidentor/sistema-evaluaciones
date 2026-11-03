package com.universidad.tests.exception;

import com.universidad.tests.domain.exception.AccesoNoPermitidoException;
import com.universidad.tests.domain.exception.EstadoNoValidoException;
import com.universidad.tests.domain.exception.ExcepcionDeDominio;
import com.universidad.tests.domain.exception.RecursoNoEncontradoException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Convierte toda excepción en el formato de error común, para que el frontend trate los errores en un solo lugar. */
@RestControllerAdvice
public class ManejadorGlobalDeErrores extends ResponseEntityExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ManejadorGlobalDeErrores.class);

    @ExceptionHandler(ExcepcionDeDominio.class)
    ResponseEntity<Object> dominio(ExcepcionDeDominio ex, HttpServletRequest solicitud) {
        HttpStatus estado = ex instanceof RecursoNoEncontradoException ? HttpStatus.NOT_FOUND
                : ex instanceof AccesoNoPermitidoException ? HttpStatus.FORBIDDEN
                : ex instanceof EstadoNoValidoException ? HttpStatus.CONFLICT
                : HttpStatus.UNPROCESSABLE_ENTITY;
        return responder(estado, ex.getCodigo(), ex.getMessage(), solicitud.getRequestURI(), null, HttpHeaders.EMPTY);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> noPrevisto(Exception ex, HttpServletRequest solicitud) {
        LOG.error("Error no previsto en {}", solicitud.getRequestURI(), ex);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_INTERNO", "Ocurrió un error interno.",
                solicitud.getRequestURI(), null, HttpHeaders.EMPTY);
    }

    /** Errores propios de Spring MVC: JSON mal formado, validación, ruta inexistente, método no permitido. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        String ruta = ((ServletWebRequest) request).getRequest().getRequestURI();
        if (ex instanceof MethodArgumentNotValidException invalido) {
            List<DetalleError> detalles = invalido.getBindingResult().getFieldErrors().stream()
                    .map(campo -> new DetalleError(campo.getField(), campo.getDefaultMessage()))
                    .toList();
            return responder(status, "VALIDACION_FALLIDA", "Hay campos inválidos.", ruta, detalles, headers);
        }
        if (status.value() == HttpStatus.NOT_FOUND.value()) {
            return responder(status, "RECURSO_NO_ENCONTRADO", "No existe el recurso solicitado.", ruta, null, headers);
        }
        return responder(status, "SOLICITUD_INVALIDA", "La solicitud no es válida.", ruta, null, headers);
    }

    private ResponseEntity<Object> responder(HttpStatusCode estado, String codigo, String mensaje, String ruta,
            List<DetalleError> detalles, HttpHeaders headers) {
        return ResponseEntity.status(estado).headers(headers)
                .body(ErrorResponse.de(estado.value(), codigo, mensaje, ruta, detalles));
    }
}
