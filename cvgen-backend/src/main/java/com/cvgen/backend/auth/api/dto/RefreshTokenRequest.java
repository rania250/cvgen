package com.cvgen.backend.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload pour le rafraîchissement d'un access token.
 */
public record RefreshTokenRequest(
        @NotBlank(message = "Le refresh token est requis")
        String refreshToken
) {
}
