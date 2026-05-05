package com.cvgen.backend.shared.exception;

/**
 * Levée lorsqu'un token (JWT ou refresh) est invalide, expiré ou révoqué.
 */
public class InvalidTokenException extends RuntimeException {

    public InvalidTokenException(String message) {
        super(message);
    }
}
