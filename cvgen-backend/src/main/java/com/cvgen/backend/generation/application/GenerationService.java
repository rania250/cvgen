package com.cvgen.backend.generation.application;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.generation.api.dto.*;
import com.cvgen.backend.generation.infrastructure.gemini.GeminiResponse;
import com.cvgen.backend.generation.infrastructure.persistence.GeneratedCvRepository;
import com.cvgen.backend.generation.infrastructure.persistence.entity.GeneratedCvEntity;
import com.cvgen.backend.profile.api.dto.*;
import com.cvgen.backend.profile.application.ProfileService;
import com.cvgen.backend.shared.config.GeminiProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service métier de génération de CV optimisé via Gemini AI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GenerationService {

    private final ProfileService profileService;
    private final GeneratedCvRepository generatedCvRepository;
    private final UserJpaRepository userRepository;
    private final GeminiProperties geminiProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static final String GEMINI_API_VERSION = "v1beta";

    /**
     * Génère un CV optimisé pour une offre d'emploi.
     *
     * @param userId       ID de l'utilisateur (depuis JWT)
     * @param jobOfferText Texte de l'offre d'emploi
     * @return Le contenu du CV généré
     */
    public SelectedCvContent generateCv(UUID userId, String jobOfferText) {
        // 1. Charger le profil complet de l'utilisateur
        UserProfileDto profile = profileService.getUserProfile(userId);

        // 2. Construire le prompt pour Gemini
        String prompt = buildPrompt(profile, jobOfferText);

        // 3. Appeler l'API Gemini
        String geminiResponse = callGeminiApi(prompt);

        // 4. Parser la réponse JSON de Gemini
        SelectedCvContent generatedContent = parseGeminiResponse(geminiResponse);

        // 5. Sauvegarder le résultat en base
        GeneratedCvEntity savedEntity = saveGeneratedCv(userId, jobOfferText, generatedContent);

        // 6. Retourner avec l'ID généré
        generatedContent.setGeneratedCvId(savedEntity.getId());
        generatedContent.setCreatedAt(savedEntity.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME));

        return generatedContent;
    }

    /**
     * Construit le prompt pour Gemini avec le profil et l'offre.
     */
    private String buildPrompt(UserProfileDto profile, String jobOfferText) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Tu es un expert en rédaction de CV. Ta mission est de sélectionner et optimiser les informations\n");
        prompt.append("du candidat pour créer un CV sur UNE SEULE PAGE, parfaitement adapté à cette offre d'emploi.\n\n");

        prompt.append("=== OFFRE D'EMPLOI ===\n");
        prompt.append(jobOfferText).append("\n\n");

        prompt.append("=== PROFIL DU CANDIDAT ===\n");
        prompt.append("Titre actuel: ").append(profile.title() != null ? profile.title() : "Non renseigné").append("\n");
        prompt.append("Résumé: ").append(profile.summary() != null ? profile.summary() : "Non renseigné").append("\n");
        prompt.append("Localisation: ").append(profile.location() != null ? profile.location() : "Non renseignée").append("\n");

        // Expériences
        prompt.append("\n--- EXPÉRIENCES PROFESSIONNELLES ---\n");
        for (ExperienceDto exp : profile.experiences()) {
            prompt.append("Poste: ").append(exp.jobTitle()).append("\n");
            prompt.append("Entreprise: ").append(exp.company()).append("\n");
            prompt.append("Lieu: ").append(exp.location() != null ? exp.location() : "Non renseigné").append("\n");
            prompt.append("Période: ").append(exp.startDate()).append(" à ")
                    .append(exp.current() ? "Aujourd'hui" : exp.endDate()).append("\n");
            prompt.append("Description: ").append(exp.description() != null ? exp.description() : "Non renseignée").append("\n\n");
        }

        // Formations
        prompt.append("\n--- FORMATIONS ---\n");
        for (EducationDto edu : profile.educations()) {
            prompt.append("Diplôme: ").append(edu.degree() != null ? edu.degree() : "Non renseigné").append("\n");
            prompt.append("École: ").append(edu.school()).append("\n");
            prompt.append("Domaine: ").append(edu.fieldOfStudy() != null ? edu.fieldOfStudy() : "Non renseigné").append("\n");
            prompt.append("Période: ").append(edu.startDate() != null ? edu.startDate() : "?")
                    .append(" à ").append(edu.endDate() != null ? edu.endDate() : "?").append("\n\n");
        }

        // Compétences
        prompt.append("\n--- COMPÉTENCES ---\n");
        for (SkillDto skill : profile.skills()) {
            prompt.append("- ").append(skill.name());
            if (skill.level() != null) {
                prompt.append(" (").append(skill.level()).append(")");
            }
            if (skill.category() != null) {
                prompt.append(" [").append(skill.category()).append("]");
            }
            prompt.append("\n");
        }

        // Langues
        prompt.append("\n--- LANGUES ---\n");
        for (LanguageDto lang : profile.languages()) {
            prompt.append("- ").append(lang.name());
            if (lang.level() != null) {
                prompt.append(" (").append(lang.level()).append(")");
            }
            prompt.append("\n");
        }

        // Certifications
        if (!profile.certifications().isEmpty()) {
            prompt.append("\n--- CERTIFICATIONS ---\n");
            for (CertificationDto cert : profile.certifications()) {
                prompt.append("- ").append(cert.name());
                if (cert.issuer() != null) {
                    prompt.append(" (").append(cert.issuer()).append(")");
                }
                prompt.append("\n");
            }
        }

        // Instructions de sortie
        prompt.append("\n=== INSTRUCTIONS ===\n");
        prompt.append("Tu dois retourner UNIQUEMENT un objet JSON valide avec cette structure exacte :\n\n");
        prompt.append("{\n");
        prompt.append("  \"title\": \"Titre professionnel réécrit et optimisé pour le poste\",\n");
        prompt.append("  \"summary\": \"Bio résumée en 3-4 lignes maximum, mettant en avant les atouts pertinents pour le poste\",\n");
        prompt.append("  \"experiences\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"jobTitle\": \"...\",\n");
        prompt.append("      \"company\": \"...\",\n");
        prompt.append("      \"location\": \"...\",\n");
        prompt.append("      \"startDate\": \"YYYY-MM-DD\",\n");
        prompt.append("      \"endDate\": \"YYYY-MM-DD ou null\",\n");
        prompt.append("      \"current\": true/false,\n");
        prompt.append("      \"description\": \"Description optimisée pour l'offre, mettant en avant les réalisations chiffrées et compétences pertinentes\"\n");
        prompt.append("    }\n");
        prompt.append("    // Maximum 4 expériences les plus pertinentes pour l'offre\n");
        prompt.append("  ],\n");
        prompt.append("  \"educations\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"degree\": \"...\",\n");
        prompt.append("      \"school\": \"...\",\n");
        prompt.append("      \"fieldOfStudy\": \"...\",\n");
        prompt.append("      \"startDate\": \"YYYY-MM-DD\",\n");
        prompt.append("      \"endDate\": \"YYYY-MM-DD\"\n");
        prompt.append("    }\n");
        prompt.append("    // Maximum 1 formation la plus pertinente ou prestigieuse\n");
        prompt.append("  ],\n");
        prompt.append("  \"skills\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"name\": \"...\",\n");
        prompt.append("      \"level\": \"BEGINNER|INTERMEDIATE|ADVANCED|EXPERT\",\n");
        prompt.append("      \"category\": \"...\"\n");
        prompt.append("    }\n");
        prompt.append("    // Maximum 12 compétences les plus pertinentes pour l'offre\n");
        prompt.append("  ],\n");
        prompt.append("  \"languages\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"name\": \"...\",\n");
        prompt.append("      \"level\": \"A1|A2|B1|B2|C1|C2|NATIVE\"\n");
        prompt.append("    }\n");
        prompt.append("    // Toutes les langues pertinentes pour le poste\n");
        prompt.append("  ],\n");
        prompt.append("  \"certifications\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"name\": \"...\",\n");
        prompt.append("      \"issuer\": \"...\",\n");
        prompt.append("      \"issueDate\": \"YYYY-MM-DD\"\n");
        prompt.append("    }\n");
        prompt.append("    // Maximum 2 certifications les plus pertinentes\n");
        prompt.append("  ]\n");
        prompt.append("}\n\n");
        prompt.append("RÈGLES IMPORTANTES :\n");
        prompt.append("1. Sélectionne UNIQUEMENT les informations les plus pertinentes pour L'OFFRE\n");
        prompt.append("2. Réécris les descriptions pour mettre en avant les réalisations chiffrées\n");
        prompt.append("3. Adapte le titre professionnel aux mots-clés de l'offre\n");
        prompt.append("4. Limite : max 4 expériences, max 12 skills, max 2 certifications, max 1 formation\n");
        prompt.append("5. Réponse UNIQUEMENT en JSON, sans markdown, sans texte avant/après");

        return prompt.toString();
    }

    /**
     * Appelle l'API Gemini et retourne le texte de réponse.
     */
    private String callGeminiApi(String prompt) {
        String apiKey = geminiProperties.apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Clé API Gemini non configurée (gemini.api-key)");
        }

        String model = geminiProperties.model() != null ? geminiProperties.model() : "gemini-1.5-flash-latest";
        String baseUrl = geminiProperties.apiUrl() != null
                ? geminiProperties.apiUrl()
                : "https://generativelanguage.googleapis.com";

        String url = String.format("%s/%s/models/%s:generateContent?key=%s",
                baseUrl, GEMINI_API_VERSION, model, apiKey);

        // Construire le corps de la requête
        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        content.put("parts", List.of(part));
        requestBody.put("contents", List.of(content));

        // Configuration pour JSON
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("maxOutputTokens", 8192);
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url, entity, GeminiResponse.class);

            GeminiResponse body = response.getBody();
        if (body == null || body.getCandidates() == null || body.getCandidates().isEmpty()) {
                throw new RuntimeException("Réponse vide de Gemini");
            }

            GeminiResponse.Candidate candidate = body.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null
                    || candidate.getContent().getParts().isEmpty()) {
                throw new RuntimeException("Contenu vide dans la réponse Gemini");
            }

            return candidate.getContent().getParts().get(0).getText();

        } catch (Exception e) {
            log.error("Erreur lors de l'appel à Gemini", e);
            throw new RuntimeException("Erreur de génération CV: " + e.getMessage(), e);
        }
    }

    /**
     * Parse la réponse texte de Gemini en objet SelectedCvContent.
     */
    private SelectedCvContent parseGeminiResponse(String geminiText) {
        try {
            // Nettoyer le texte (parfois Gemini wrap dans ```json ... ```)
            String json = geminiText.trim();
            if (json.startsWith("```json")) {
                json = json.substring(7);
            }
            if (json.startsWith("```")) {
                json = json.substring(3);
            }
            if (json.endsWith("```")) {
                json = json.substring(0, json.length() - 3);
            }
            json = json.trim();

            return objectMapper.readValue(json, SelectedCvContent.class);

        } catch (JsonProcessingException e) {
            log.error("Erreur de parsing JSON Gemini: {}", geminiText, e);
            throw new RuntimeException("Format de réponse Gemini invalide: " + e.getMessage(), e);
        }
    }

    /**
     * Sauvegarde le CV généré en base de données.
     */
    private GeneratedCvEntity saveGeneratedCv(UUID userId, String jobOfferText, SelectedCvContent content) {
        try {
            GeneratedCvEntity entity = GeneratedCvEntity.builder()
                    .user(userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId)))
                    .jobOfferText(jobOfferText)
                    .title(content.getTitle())
                    .summary(content.getSummary())
                    .experiences(objectMapper.writeValueAsString(content.getExperiences()))
                    .educations(objectMapper.writeValueAsString(content.getEducations()))
                    .skills(objectMapper.writeValueAsString(content.getSkills()))
                    .languages(objectMapper.writeValueAsString(content.getLanguages()))
                    .certifications(objectMapper.writeValueAsString(content.getCertifications()))
                    .createdAt(LocalDateTime.now())
                    .build();

            return generatedCvRepository.save(entity);

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Erreur de sérialisation JSON", e);
        }
    }
}
