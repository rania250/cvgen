package com.cvgen.backend.shared.exception;

/**
 * Levée lorsqu'une ressource demandée n'existe pas en base.
 * Traduit en HTTP 404 par {@link GlobalExceptionHandler}.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
