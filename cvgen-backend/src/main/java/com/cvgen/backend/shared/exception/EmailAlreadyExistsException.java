package com.cvgen.backend.shared.exception;

/**
 * Levée lorsqu'on tente de créer un compte avec un email déjà utilisé.
 */
public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String email) {
        super("Un compte existe déjà pour l'email : " + email);
    }
}
