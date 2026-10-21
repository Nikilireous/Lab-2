package ru.itmo.lab3.api;

import jakarta.json.bind.JsonbException;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

@Provider
public class ApiExceptionMapper implements ExceptionMapper<Throwable> {
    private static final Logger LOG = Logger.getLogger(ApiExceptionMapper.class.getName());

    @Override
    public Response toResponse(Throwable error) {
        int status;
        Map<String, String> errors;
        if (error instanceof ApiException apiError) {
            status = apiError.getStatus();
            errors = apiError.getErrors();
        } else if (error instanceof WebApplicationException httpError) {
            status = httpError.getResponse().getStatus();
            errors = Map.of("detail", status == 404 ? "Ресурс не найден." : "Некорректный запрос.");
        } else if (error instanceof ProcessingException && causedByJsonb(error)) {
            status = 400;
            errors = Map.of("detail", "Некорректный JSON.");
        } else {
            LOG.log(Level.SEVERE, "Необработанная ошибка API", error);
            status = 500;
            errors = Map.of("detail", "Внутренняя ошибка сервера.");
        }
        return Response.status(status).type(MediaType.APPLICATION_JSON_TYPE)
            .entity(Map.of("errors", errors)).build();
    }

    private static boolean causedByJsonb(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof JsonbException) return true;
        }
        return false;
    }
}
