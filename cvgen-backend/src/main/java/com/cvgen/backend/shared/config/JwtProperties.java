package com.cvgen.backend.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Propriétés de configuration JWT (préfixe "jwt").
 * Chargées depuis application.yml / variables d'environnement.
 *
 * @param secret                 clé secrète HMAC (min. 32 caractères)
 * @param accessTokenExpiration  durée de vie de l'access token (ms)
 * @param refreshTokenExpiration durée de vie du refresh token (ms)
 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        long accessTokenExpiration,
        long refreshTokenExpiration
) {
}
