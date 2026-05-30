package com.cvgen.backend.generation.application;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.generation.api.dto.*;
import com.cvgen.backend.generation.infrastructure.gemini.GeminiClient;
import com.cvgen.backend.generation.infrastructure.persistence.GeneratedCvRepository;
import com.cvgen.backend.generation.infrastructure.persistence.entity.GeneratedCvEntity;
import com.cvgen.backend.profile.api.dto.*;
import com.cvgen.backend.profile.application.ProfileService;
import com.cvgen.backend.shared.util.LenientJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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
    private final GeminiClient geminiClient;

    private final ObjectMapper objectMapper = LenientJson.mapper();

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

        // 3. Appeler l'API Gemini (T=0.7 pour de la réécriture optimisée)
        String geminiResponse = geminiClient.generateContent(prompt, 0.7, 8192);

        // 4. Parser la réponse JSON de Gemini
        SelectedCvContent generatedContent = parseGeminiResponse(geminiResponse);

        // 4b. Garantir toutes les formations du profil + valider les projets
        enrichGeneratedContent(generatedContent, profile);

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
        if (profile.linkedinUrl() != null && !profile.linkedinUrl().isBlank()) {
            prompt.append("LinkedIn: ").append(profile.linkedinUrl()).append("\n");
        }
        if (profile.githubUrl() != null && !profile.githubUrl().isBlank()) {
            prompt.append("GitHub: ").append(profile.githubUrl()).append("\n");
        }
        if (profile.portfolioUrl() != null && !profile.portfolioUrl().isBlank()) {
            prompt.append("Portfolio: ").append(profile.portfolioUrl()).append("\n");
        }

        // Expériences
        prompt.append("\n--- EXPÉRIENCES PROFESSIONNELLES ---\n");
        for (ExperienceDto exp : profile.experiences()) {
            prompt.append("Poste: ").append(exp.jobTitle()).append("\n");
            prompt.append("Entreprise: ").append(exp.company()).append("\n");
            prompt.append("Lieu: ").append(exp.location() != null ? exp.location() : "Non renseigné").append("\n");
            String startStr = formatSafeDate(exp.startDate());
            String endStr = exp.current() ? "Aujourd'hui" : formatSafeDate(exp.endDate());
            prompt.append("Période: ").append(startStr).append(" à ").append(endStr).append("\n");
            prompt.append("Description: ").append(exp.description() != null ? exp.description() : "Non renseignée").append("\n\n");
        }

        // Formations
        prompt.append("\n--- FORMATIONS ---\n");
        for (EducationDto edu : profile.educations()) {
            prompt.append("Diplôme: ").append(edu.degree() != null ? edu.degree() : "Non renseigné").append("\n");
            prompt.append("École: ").append(edu.school()).append("\n");
            prompt.append("Domaine: ").append(edu.fieldOfStudy() != null ? edu.fieldOfStudy() : "Non renseigné").append("\n");
            prompt.append("Période: ").append(formatSafeDate(edu.startDate()))
                    .append(" à ").append(formatSafeDate(edu.endDate())).append("\n\n");
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

        // Projets
        if (profile.projects() != null && !profile.projects().isEmpty()) {
            prompt.append("\n--- PROJETS ---\n");
            for (ProjectDto project : profile.projects()) {
                prompt.append("Nom: ").append(project.name()).append("\n");
                prompt.append("Description: ").append(project.description() != null ? project.description() : "Non renseignée").append("\n");
                prompt.append("Stack technique: ").append(project.techStack() != null ? project.techStack() : "Non renseigné").append("\n");
                if (project.url() != null && !project.url().isBlank()) {
                    prompt.append("URL: ").append(project.url()).append("\n");
                }
                prompt.append("Période: ").append(formatSafeDate(project.startDate()))
                        .append(" à ").append(formatSafeDate(project.endDate())).append("\n\n");
            }
        }

        // Certifications
        if (profile.certifications() != null && !profile.certifications().isEmpty()) {
            prompt.append("\n--- CERTIFICATIONS ---\n");
            for (CertificationDto cert : profile.certifications()) {
                prompt.append("- ").append(cert.name());
                if (cert.issuer() != null) {
                    prompt.append(" (").append(cert.issuer()).append(")");
                }
                if (cert.issueDate() != null) {
                    prompt.append(" — ").append(formatSafeDate(cert.issueDate()));
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
        prompt.append("    // INCLURE TOUTES les formations du profil ci-dessus, sans en omettre aucune\n");
        prompt.append("  ],\n");
        prompt.append("  \"projects\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"name\": \"...\",\n");
        prompt.append("      \"description\": \"Description optimisée pour l'offre, mettant en avant les technologies et résultats pertinents\",\n");
        prompt.append("      \"techStack\": \"Technologies utilisées (ex: Java, React, PostgreSQL)\",\n");
        prompt.append("      \"url\": \"URL du projet ou null\",\n");
        prompt.append("      \"startDate\": \"YYYY-MM-DD ou null\",\n");
        prompt.append("      \"endDate\": \"YYYY-MM-DD ou null\"\n");
        prompt.append("    }\n");
        prompt.append("    // Maximum 2 projets les plus pertinents pour l'offre d'emploi\n");
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
        prompt.append("    // Inclure TOUTES les certifications du profil (max 4)\n");
        prompt.append("  ]\n");
        prompt.append("}\n\n");
        prompt.append("RÈGLES IMPORTANTES :\n");
        prompt.append("1. Sélectionne UNIQUEMENT les informations les plus pertinentes pour L'OFFRE\n");
        prompt.append("2. Réécris les descriptions pour mettre en avant les réalisations chiffrées\n");
        prompt.append("3. Adapte le titre professionnel aux mots-clés de l'offre\n");
        prompt.append("4. Limite : max 4 expériences, max 12 skills, max 4 certifications, max 2 projets pertinents pour l'offre\n");
        prompt.append("5. INCLURE TOUTES les formations du profil dans \"educations\", sans en omettre aucune.\n");
        prompt.append("6. INCLURE TOUTES les certifications présentes dans le profil ci-dessus, même si peu liées à l'offre.\n");
        prompt.append("7. Sélectionne uniquement les projets dont le stack ou la description correspondent au poste visé.\n");
        prompt.append("8. Si une date est manquante ou suspecte (laissée à vide ci-dessus), retourne null pour cette date plutôt que d'inventer.\n");
        prompt.append("9. Réponse UNIQUEMENT en JSON, sans markdown, sans texte avant/après");

        return prompt.toString();
    }

    /**
     * Complète le contenu généré : toutes les formations du profil,
     * projets filtrés sur ceux présents dans le profil.
     */
    private void enrichGeneratedContent(SelectedCvContent content, UserProfileDto profile) {
        content.setEducations(mapAllEducations(profile.educations()));

        if (profile.projects() == null || profile.projects().isEmpty()) {
            content.setProjects(Collections.emptyList());
            return;
        }

        Map<String, ProjectDto> profileByName = profile.projects().stream()
                .filter(p -> p.name() != null && !p.name().isBlank())
                .collect(Collectors.toMap(
                        p -> p.name().trim().toLowerCase(Locale.ROOT),
                        p -> p,
                        (a, b) -> a,
                        LinkedHashMap::new));

        List<SelectedProjectDto> merged = new ArrayList<>();
        if (content.getProjects() != null) {
            for (SelectedProjectDto selected : content.getProjects()) {
                if (selected.getName() == null || selected.getName().isBlank()) {
                    continue;
                }
                ProjectDto profileProject = profileByName.get(selected.getName().trim().toLowerCase(Locale.ROOT));
                if (profileProject != null) {
                    merged.add(mergeProject(selected, profileProject));
                    if (merged.size() >= 2) {
                        break;
                    }
                }
            }
        }
        content.setProjects(merged);
    }

    private SelectedProjectDto mergeProject(SelectedProjectDto gemini, ProjectDto profile) {
        return SelectedProjectDto.builder()
                .name(profile.name())
                .description(hasText(gemini.getDescription()) ? gemini.getDescription() : profile.description())
                .techStack(hasText(gemini.getTechStack()) ? gemini.getTechStack() : profile.techStack())
                .url(hasText(gemini.getUrl()) ? gemini.getUrl() : profile.url())
                .startDate(gemini.getStartDate() != null ? gemini.getStartDate()
                        : profile.startDate() != null ? profile.startDate().toString() : null)
                .endDate(gemini.getEndDate() != null ? gemini.getEndDate()
                        : profile.endDate() != null ? profile.endDate().toString() : null)
                .build();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<SelectedEducationDto> mapAllEducations(List<EducationDto> educations) {
        if (educations == null || educations.isEmpty()) {
            return Collections.emptyList();
        }
        List<SelectedEducationDto> result = new ArrayList<>();
        for (EducationDto edu : educations) {
            result.add(SelectedEducationDto.builder()
                    .degree(edu.degree())
                    .school(edu.school())
                    .fieldOfStudy(edu.fieldOfStudy())
                    .startDate(edu.startDate() != null ? edu.startDate().toString() : null)
                    .endDate(edu.endDate() != null ? edu.endDate().toString() : null)
                    .build());
        }
        return result;
    }

    /**
     * Formate une date pour le prompt en filtrant les valeurs aberrantes :
     * une date antérieure à l'an 2000 est considérée comme parsing-bruit
     * (cf. Bug "02/2000" injecté par l'import PDF) et remplacée par "Non précisée".
     */
    private String formatSafeDate(LocalDate date) {
        if (date == null) return "Non précisée";
        if (date.getYear() < 2000) return "Non précisée";
        return date.toString();
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
                    .projects(objectMapper.writeValueAsString(
                            content.getProjects() != null ? content.getProjects() : Collections.emptyList()))
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
