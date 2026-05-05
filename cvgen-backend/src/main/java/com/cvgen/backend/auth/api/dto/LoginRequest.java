package com.cvgen.backend.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload de connexion.
 */
public record LoginRequest(
        @NotBlank(message = "L'email est requis")
        @Email(message = "Format d'email invalide")
        String email,

        @NotBlank(message = "Le mot de passe est requis")
        String password
) {
}
