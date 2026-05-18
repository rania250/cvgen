package com.cvgen.backend.generation.application.exception;

/**
 * Exception lancée lorsqu'une erreur survient pendant la compilation PDF.
 */
public class PdfCompilationException extends RuntimeException {

    public PdfCompilationException(String message) {
        super(message);
    }

    public PdfCompilationException(String message, Throwable cause) {
        super(message, cause);
    }
}
