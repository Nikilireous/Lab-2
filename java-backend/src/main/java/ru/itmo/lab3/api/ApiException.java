package ru.itmo.lab3.api;

import jakarta.ejb.ApplicationException;
import java.util.Map;

@ApplicationException(rollback = true)
public class ApiException extends RuntimeException {
    private final int status;
    private final Map<String, String> errors;

    public ApiException(int status, String field, String message) {
        super(message);
        this.status = status;
        this.errors = Map.of(field, message);
    }

    public int getStatus() { return status; }
    public Map<String, String> getErrors() { return errors; }
}
