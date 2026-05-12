package com.cvgen.backend.generation.infrastructure.gemini;

import lombok.Data;

import java.util.List;

/**
 * Réponse de l'API Gemini pour la génération de CV.
 */
@Data
public class GeminiResponse {

    private List<Candidate> candidates;

    @Data
    public static class Candidate {
        private Content content;
        private String finishReason;
    }

    @Data
    public static class Content {
        private List<Part> parts;
    }

    @Data
    public static class Part {
        private String text;
    }
}
