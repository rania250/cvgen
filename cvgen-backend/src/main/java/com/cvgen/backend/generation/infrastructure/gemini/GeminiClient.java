package com.cvgen.backend.generation.infrastructure.gemini;

import com.cvgen.backend.shared.config.GeminiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Client réutilisable pour l'API Gemini (Google Generative Language).
 *
 * <p>Centralise l'appel HTTP afin que plusieurs services (génération de CV,
 * parsing intelligent de CV importés, etc.) puissent réutiliser la même
 * logique sans dupliquer la signature du payload, la gestion des erreurs ou
 * la lecture de la configuration.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiClient {

    private static final String GEMINI_API_VERSION = "v1beta";
    private static final String DEFAULT_MODEL = "gemini-2.5-flash";
    private static final String DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";

    // Nombre total de tentatives en cas de 429 (limite de débit par minute).
    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 4000L;

    private final GeminiProperties geminiProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Envoie un prompt à Gemini et retourne le texte brut de la première réponse.
     *
     * @param prompt           Texte complet du prompt à envoyer.
     * @param temperature      Température d'inférence (0.0 = déterministe, 1.0 = créatif).
     * @param maxOutputTokens  Limite haute de tokens en sortie.
     * @return Texte de la réponse (peut contenir un wrapper ```json ... ``` à nettoyer côté appelant).
     */
    public String generateContent(String prompt, double temperature, int maxOutputTokens) {
        String apiKey = geminiProperties.apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Clé API Gemini non configurée (gemini.api-key)");
        }

        String model = geminiProperties.model() != null ? geminiProperties.model() : DEFAULT_MODEL;
        String baseUrl = geminiProperties.apiUrl() != null ? geminiProperties.apiUrl() : DEFAULT_BASE_URL;

        String url = String.format("%s/%s/models/%s:generateContent?key=%s",
                baseUrl, GEMINI_API_VERSION, model, apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        content.put("parts", List.of(part));
        requestBody.put("contents", List.of(content));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", temperature);
        generationConfig.put("maxOutputTokens", maxOutputTokens);
        // Demander explicitement du JSON quand c'est possible (supporté par Gemini 1.5+).
        generationConfig.put("responseMimeType", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                ResponseEntity<GeminiResponse> response =
                        restTemplate.postForEntity(url, entity, GeminiResponse.class);
                GeminiResponse body = response.getBody();
                if (body == null || body.getCandidates() == null || body.getCandidates().isEmpty()) {
                    throw new RuntimeException("Réponse vide de Gemini");
                }
                GeminiResponse.Candidate candidate = body.getCandidates().get(0);
                if (candidate.getContent() == null
                        || candidate.getContent().getParts() == null
                        || candidate.getContent().getParts().isEmpty()) {
                    throw new RuntimeException("Contenu vide dans la réponse Gemini");
                }
                return candidate.getContent().getParts().get(0).getText();

            } catch (HttpClientErrorException.TooManyRequests ex) {
                // 429 : quota / limite de débit dépassé. On retente quelques fois
                // (utile pour la limite "par minute"), puis on remonte un message
                // clair (HTTP 429) au lieu d'un 500 opaque.
                log.warn("Gemini 429 (quota) — tentative {}/{}", attempt, MAX_ATTEMPTS);
                if (attempt < MAX_ATTEMPTS) {
                    sleep(RETRY_DELAY_MS);
                    continue;
                }
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Quota de l'IA atteint (limite gratuite Gemini dépassée). "
                                + "Réessayez dans quelques minutes, demain (réinitialisation à minuit heure Pacifique), "
                                + "ou utilisez une clé API d'un nouveau projet Google.");

            } catch (HttpClientErrorException ex) {
                // 400/401/403… : clé invalide, clé signalée comme fuitée, etc.
                log.error("Gemini erreur {} : {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Service IA indisponible (Gemini " + ex.getStatusCode().value()
                                + "). Vérifiez la clé API ou réessayez plus tard.");

            } catch (HttpServerErrorException ex) {
                // 5xx Gemini (ex. 503 "model overloaded", fréquent sur le tier
                // gratuit). On retente quelques fois puis on remonte un message
                // clair au lieu d'un 500 opaque.
                log.warn("Gemini 5xx ({}) — tentative {}/{}", ex.getStatusCode(), attempt, MAX_ATTEMPTS);
                if (attempt < MAX_ATTEMPTS) {
                    sleep(RETRY_DELAY_MS);
                    continue;
                }
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Service IA momentanément surchargé (Gemini " + ex.getStatusCode().value()
                                + "). Réessayez dans quelques instants.");

            } catch (ResponseStatusException e) {
                throw e; // déjà porteur d'un statut/message explicite

            } catch (RuntimeException e) {
                // Erreurs réseau (ResourceAccessException), réponse vide, etc.
                log.error("Erreur lors de l'appel à Gemini", e);
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Service IA injoignable : " + e.getMessage());
            }
        }
        // Inatteignable en théorie (la boucle retourne ou lève toujours).
        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Quota de l'IA atteint. Réessayez plus tard.");
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    /** Variante avec température/tokens par défaut adaptée à de la génération créative. */
    public String generateContent(String prompt) {
        return generateContent(prompt, 0.7, 8192);
    }
}
