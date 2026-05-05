package com.cvgen.backend.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload de création de compte.
 */
public record RegisterRequest(
        @NotBlank(message = "Le prénom est requis")
        String firstName,

        @NotBlank(message = "Le nom est requis")
        String lastName,

        @NotBlank(message = "L'email est requis")
        @Email(message = "Format d'email invalide")
        String email,

        @NotBlank(message = "Le mot de passe est requis")
        @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
        String password
) {
}
