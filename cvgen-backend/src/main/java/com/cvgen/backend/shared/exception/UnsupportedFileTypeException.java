package com.cvgen.backend.shared.exception;

/**
 * Levée lorsqu'un fichier uploadé a un format non supporté
 * (autre que PDF / DOCX pour l'import de CV).
 * Traduit en HTTP 415 par {@link GlobalExceptionHandler}.
 */
public class UnsupportedFileTypeException extends RuntimeException {

    public UnsupportedFileTypeException(String message) {
        super(message);
    }
}
