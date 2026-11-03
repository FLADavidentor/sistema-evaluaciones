package com.universidad.tests.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.universidad.tests.domain.exception.AccesoNoPermitidoException;
import com.universidad.tests.domain.exception.EstadoNoValidoException;
import com.universidad.tests.domain.exception.RecursoNoEncontradoException;
import com.universidad.tests.domain.exception.ReglaDeNegocioException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

class ManejadorGlobalDeErroresTest {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ControladorDePrueba())
            .setControllerAdvice(new ManejadorGlobalDeErrores())
            .build();

    @Test
    void cadaErrorDeDominioTieneSuCodigoHttp() throws Exception {
        verificar("no-existe", 404, "EVALUACION_NO_ENCONTRADA");
        verificar("sin-permiso", 403, "SIN_PERMISO");
        verificar("estado", 409, "EVALUACION_FINALIZADA");
        verificar("regla", 422, "OPCION_NO_PERTENECE");
        verificar("fallo", 500, "ERROR_INTERNO");
    }

    @Test
    void validacionDevuelveDetallesPorCampo() throws Exception {
        mvc.perform(post("/prueba/validar").contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACION_FALLIDA"))
                .andExpect(jsonPath("$.detalles[0].campo").value("nombre"));
    }

    @Test
    void jsonMalFormadoEsSolicitudInvalida() throws Exception {
        mvc.perform(post("/prueba/validar").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("SOLICITUD_INVALIDA"))
                .andExpect(jsonPath("$.detalles").doesNotExist());
    }

    private void verificar(String caso, int estado, String codigo) throws Exception {
        mvc.perform(get("/prueba/" + caso))
                .andExpect(status().is(estado))
                .andExpect(jsonPath("$.status").value(estado))
                .andExpect(jsonPath("$.codigo").value(codigo))
                .andExpect(jsonPath("$.ruta").value("/prueba/" + caso))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.detalles").doesNotExist());
    }

    record Solicitud(@NotBlank String nombre) {
    }

    @RestController
    static class ControladorDePrueba {
        @GetMapping("/prueba/{caso}")
        String lanzar(@PathVariable String caso) {
            switch (caso) {
                case "no-existe" -> throw new RecursoNoEncontradoException("EVALUACION_NO_ENCONTRADA", "No existe.");
                case "sin-permiso" -> throw new AccesoNoPermitidoException("SIN_PERMISO", "Sin permiso.");
                case "estado" -> throw new EstadoNoValidoException("EVALUACION_FINALIZADA", "Ya finalizó.");
                case "regla" -> throw new ReglaDeNegocioException("OPCION_NO_PERTENECE", "No pertenece.");
                default -> throw new IllegalStateException("fallo");
            }
        }

        @PostMapping("/prueba/validar")
        String validar(@Valid @RequestBody Solicitud solicitud) {
            return solicitud.nombre();
        }
    }
}
