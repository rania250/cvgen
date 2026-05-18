package com.cvgen.backend.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Propriétés de configuration pour l'API Gemini.
 */
@ConfigurationProperties(prefix = "gemini")
public record GeminiProperties(
        String apiKey,
        String apiUrl,      // ex: https://generativelanguage.googleapis.com/v1beta/models
        String model        // ex: gemini-1.5-flash-latest
) {
}
