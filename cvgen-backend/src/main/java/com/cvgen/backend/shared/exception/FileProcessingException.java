package com.cvgen.backend.shared.exception;

/**
 * Levée lorsqu'un fichier ne peut pas être traité
 * (taille dépassée, fichier corrompu, erreur d'extraction…).
 * Traduit en HTTP 400 par {@link GlobalExceptionHandler}.
 */
public class FileProcessingException extends RuntimeException {

    public FileProcessingException(String message) {
        super(message);
    }

    public FileProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
