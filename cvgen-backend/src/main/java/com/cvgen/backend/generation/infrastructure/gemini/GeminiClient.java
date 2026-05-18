package com.cvgen.backend.generation.infrastructure.gemini;

import com.cvgen.backend.shared.config.GeminiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

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

        try {
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(url, entity, GeminiResponse.class);
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
        } catch (RuntimeException e) {
            log.error("Erreur lors de l'appel à Gemini", e);
            throw new RuntimeException("Erreur de génération via Gemini: " + e.getMessage(), e);
        }
    }

    /** Variante avec température/tokens par défaut adaptée à de la génération créative. */
    public String generateContent(String prompt) {
        return generateContent(prompt, 0.7, 8192);
    }
}
