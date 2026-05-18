package com.cvgen.backend.ats.application;

import com.cvgen.backend.ats.api.dto.AtsScoreDto;
import com.cvgen.backend.generation.infrastructure.gemini.GeminiClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AtsScoreService {

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AtsScoreDto analyzeAts(String cvText, String offerText) {
        String prompt = buildPrompt(cvText, offerText);
        String geminiResponse = geminiClient.generateContent(prompt, 0.3, 4096);
        return parseGeminiResponse(geminiResponse);
    }

    private String buildPrompt(String cvText, String offerText) {
        return """
                Tu es un expert ATS (Applicant Tracking System).
                Analyse la correspondance entre ce CV et cette offre d'emploi.
                Retourne UNIQUEMENT un JSON valide sans markdown :

                {
                  "score": nombre entre 0 et 100,
                  "matchedKeywords": [liste des mots-clés du CV présents dans l'offre],
                  "missingKeywords": [liste des mots-clés de l'offre absents du CV],
                  "matchedSkills": [compétences techniques du CV qui correspondent à l'offre],
                  "missingSkills": [compétences techniques demandées dans l'offre mais absentes du CV],
                  "suggestions": [liste de conseils concrets pour améliorer la correspondance],
                  "strongPoints": [liste des points forts du CV par rapport à l'offre]
                }

                CV : %s
                Offre : %s
                """.formatted(cvText, offerText);
    }

    private AtsScoreDto parseGeminiResponse(String geminiText) {
        try {
            String json = cleanJson(geminiText);
            JsonNode root = objectMapper.readTree(json);

            int score = root.path("score").asInt(0);
            score = Math.max(0, Math.min(100, score));

            return new AtsScoreDto(
                    score,
                    readStringList(root, "matchedKeywords"),
                    readStringList(root, "missingKeywords"),
                    readStringList(root, "matchedSkills"),
                    readStringList(root, "missingSkills"),
                    readStringList(root, "suggestions"),
                    readStringList(root, "strongPoints")
            );
        } catch (JsonProcessingException e) {
            log.error("Erreur de parsing JSON Gemini ATS: {}", geminiText, e);
            throw new RuntimeException("Format de réponse Gemini invalide: " + e.getMessage(), e);
        }
    }

    private static String cleanJson(String geminiText) {
        String json = geminiText.trim();
        if (json.startsWith("```json")) {
            json = json.substring(7);
        } else if (json.startsWith("```")) {
            json = json.substring(3);
        }
        if (json.endsWith("```")) {
            json = json.substring(0, json.length() - 3);
        }
        return json.trim();
    }

    private List<String> readStringList(JsonNode root, String field) {
        JsonNode node = root.path(field);
        if (!node.isArray()) {
            return Collections.emptyList();
        }
        List<String> values = new ArrayList<>();
        node.forEach(item -> {
            if (item.isTextual()) {
                String text = item.asText().trim();
                if (!text.isEmpty()) {
                    values.add(text);
                }
            }
        });
        return values;
    }
}
