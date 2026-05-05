package com.cvgen.backend.auth.api.dto;

import lombok.Builder;

import java.util.UUID;

/**
 * Réponse renvoyée après register / login / refresh.
 */
@Builder
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UUID userId,
        String email,
        String firstName,
        String lastName
) {
}
