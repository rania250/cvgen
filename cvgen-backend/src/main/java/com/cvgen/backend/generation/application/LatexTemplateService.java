package com.cvgen.backend.generation.application;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.auth.infrastructure.persistence.entity.UserEntity;
import com.cvgen.backend.generation.api.dto.*;
import com.cvgen.backend.generation.infrastructure.persistence.GeneratedCvRepository;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import com.cvgen.backend.profile.application.ProfileService;
import com.cvgen.backend.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service de génération de CV LaTeX à partir de templates.
 * Remplace les placeholders par les données du profil et du contenu généré.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LatexTemplateService {

    private final ProfileService profileService;
    private final UserJpaRepository userRepository;
    private final GeneratedCvRepository generatedCvRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    /**
     * Charge le template LaTeX depuis les resources et injecte les données.
     *
     * @param userId         ID de l'utilisateur
     * @param generatedCvId  ID du CV généré
     * @param templateId     ID du template (ex: "template1")
     * @return Le contenu LaTeX avec les placeholders remplacés
     */
    public String generateLatex(UUID userId, UUID generatedCvId, String templateId) {
        log.info("Génération LaTeX pour user={}, cv={}, template={}", userId, generatedCvId, templateId);

        // Charger les données
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        UserProfileDto profile = profileService.getUserProfile(userId);
        SelectedCvContent cvContent = generatedCvRepository.findById(generatedCvId)
                .map(entity -> mapEntityToDto(entity))
                .orElseThrow(() -> new ResourceNotFoundException("CV généré non trouvé: " + generatedCvId));

        // Charger le template
        String template = loadTemplate(templateId);

        // Remplacer les placeholders
        String result = replacePlaceholders(template, user, profile, cvContent);

        log.info("Génération LaTeX terminée");
        return result;
    }

    /**
     * Charge le fichier template .tex depuis les resources.
     */
    private String loadTemplate(String templateId) {
        String path = "templates/latex/" + templateId + ".tex";
        try {
            ClassPathResource resource = new ClassPathResource(path);
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                return reader.lines().collect(Collectors.joining("\n"));
            }
        } catch (IOException e) {
            log.error("Erreur lors du chargement du template: {}", path, e);
            throw new RuntimeException("Template non trouvé: " + templateId, e);
        }
    }

    /**
     * Remplace tous les placeholders dans le template.
     */
    private String replacePlaceholders(String template, UserEntity user, UserProfileDto profile, SelectedCvContent cvContent) {
        Map<String, String> placeholders = new HashMap<>();

        // Informations personnelles
        String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String last = user.getLastName() != null ? user.getLastName().trim() : "";
        String rawName = (first + " " + last).trim();
        if (rawName.isEmpty() && user.getEmail() != null) {
            // Fallback : partie locale de l'email, capitalisée
            String local = user.getEmail().split("@")[0].replace('.', ' ').replace('_', ' ').replace('-', ' ');
            rawName = local.trim();
        }
        String fullName = escapeLatex(rawName);
        placeholders.put("{{FULL_NAME}}", fullName.isEmpty() ? "Nom Prénom" : fullName);
        placeholders.put("{{PHONE}}", escapeLatex(profile.phone() != null ? profile.phone() : ""));
        placeholders.put("{{EMAIL}}", escapeLatex(user.getEmail()));
        placeholders.put("{{PORTFOLIO_URL}}", formatUrl(profile.portfolioUrl(), "Portfolio"));
        placeholders.put("{{LINKEDIN_URL}}", formatUrl(profile.linkedinUrl(), "LinkedIn"));
        placeholders.put("{{GITHUB_URL}}", formatUrl(profile.githubUrl(), "GitHub"));
        placeholders.put("{{MOBILITY_NOTE}}", escapeLatex(profile.location() != null ? profile.location() : ""));
        placeholders.put("{{BIO}}", escapeLatex(cvContent.getSummary() != null ? cvContent.getSummary() : ""));

        // Sections dynamiques
        placeholders.put("{{EXPERIENCES}}", generateExperiences(cvContent.getExperiences()));
        placeholders.put("{{EDUCATIONS}}", generateEducations(cvContent.getEducations()));
        placeholders.put("{{PROJECTS}}", generateProjects(cvContent.getProjects()));
        placeholders.put("{{SKILLS}}", generateSkills(cvContent.getSkills()));
        placeholders.put("{{CERTIFICATIONS}}", generateCertifications(cvContent.getCertifications()));
        placeholders.put("{{LANGUAGES}}", generateLanguages(cvContent.getLanguages()));
        placeholders.put("{{LAST_UPDATED}}",
                LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.FRENCH)));

        // Remplacer tous les placeholders
        String result = template;
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }

        return result;
    }

    /**
     * Formate une URL pour LaTeX avec hyperref.
     */
    private String formatUrl(String url, String label) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String escapedUrl = escapeLatex(url);
        return " $|$ \\href{" + escapedUrl + "}{" + label + "}";
    }

    /**
     * Génère le bloc LaTeX pour les expériences.
     */
    private String generateExperiences(List<SelectedExperienceDto> experiences) {
        if (experiences == null || experiences.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (SelectedExperienceDto exp : experiences) {
            String dates = formatDates(exp.getStartDate(), exp.getEndDate(), exp.isCurrent());
            String title = escapeLatex(exp.getJobTitle());
            String company = escapeLatex(exp.getCompany());
            String location = escapeLatex(exp.getLocation() != null ? exp.getLocation() : "");

            String heading = title;
            if (!company.isBlank()) {
                heading += " - " + company;
            }
            if (!location.isBlank()) {
                heading += ", " + location;
            }

            sb.append("\\begin{joblong}{").append(heading).append("}{").append(dates).append("}\n");

            if (exp.getDescription() != null && !exp.getDescription().isBlank()) {
                String[] bullets = exp.getDescription().split("\\.\\s+");
                for (String bullet : bullets) {
                    if (!bullet.trim().isEmpty()) {
                        sb.append("\\item ").append(escapeLatex(bullet.trim()));
                        if (!bullet.trim().endsWith(".")) {
                            sb.append(".");
                        }
                        sb.append("\n");
                    }
                }
            }
            sb.append("\\end{joblong}\n\n");
        }
        return sb.toString();
    }

    /**
     * Génère le bloc LaTeX pour les formations.
     */
    private String generateEducations(List<SelectedEducationDto> educations) {
        if (educations == null || educations.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (SelectedEducationDto edu : educations) {
            String dates = formatDates(edu.getStartDate(), edu.getEndDate(), false);
            String degree = escapeLatex(edu.getDegree());
            String school = escapeLatex(edu.getSchool());
            String field = escapeLatex(edu.getFieldOfStudy() != null ? edu.getFieldOfStudy() : "");

            String title = degree;
            if (!field.isBlank()) {
                title += " - " + field;
            }
            sb.append(dates).append(" & ").append(title).append(" at \\textbf{").append(school).append("} \\\\\n");
        }
        return sb.toString();
    }

    /**
     * Génère le bloc LaTeX pour les projets.
     */
    private String generateProjects(List<SelectedProjectDto> projects) {
        if (projects == null || projects.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (SelectedProjectDto p : projects) {
            String name = escapeLatex(p.getName() != null ? p.getName() : "Projet");
            String stack = p.getTechStack() != null ? escapeLatex(p.getTechStack()) : "";
            String desc = p.getDescription() != null ? escapeLatex(p.getDescription()) : "";
            String url = p.getUrl() != null && !p.getUrl().isBlank()
                    ? " \\href{" + p.getUrl() + "}{\\footnotesize\\textcolor{cvlink}{[lien]}}"
                    : "";

            sb.append("\\projectitem{").append(name).append("}")
                    .append("{").append(stack).append("}")
                    .append("{").append(desc).append("}")
                    .append(url).append("\n\n");
        }
        return sb.toString();
    }

    /**
     * Génère le bloc LaTeX pour les compétences.
     */
    private String generateSkills(List<SelectedSkillDto> skills) {
        if (skills == null || skills.isEmpty()) {
            return "";
        }

        // Grouper par catégorie
        Map<String, List<String>> skillsByCategory = skills.stream()
                .collect(Collectors.groupingBy(
                        skill -> skill.getCategory() != null ? skill.getCategory() : "Autres",
                        Collectors.mapping(SelectedSkillDto::getName, Collectors.toList())
                ));

        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, List<String>> entry : skillsByCategory.entrySet()) {
            String category = escapeLatex(entry.getKey());
            String skillList = entry.getValue().stream()
                    .map(this::escapeLatex)
                    .collect(Collectors.joining(", "));
            sb.append(category).append(" & \\normalsize{").append(skillList).append("}\\\\\n");
        }
        return sb.toString();
    }

    /**
     * Génère le bloc LaTeX pour les certifications.
     */
    private String generateCertifications(List<SelectedCertificationDto> certifications) {
        if (certifications == null || certifications.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (SelectedCertificationDto cert : certifications) {
            String name = escapeLatex(cert.getName());
            String issuer = escapeLatex(cert.getIssuer() != null ? cert.getIssuer() : "");
            String date = formatDate(cert.getIssueDate());

            sb.append("\\begin{jobshort}{").append(name);
            if (!issuer.isBlank()) {
                sb.append(" - ").append(issuer);
            }
            sb.append("}{").append(date).append("}\n");
            sb.append("\\end{jobshort}\n\n");
        }
        return sb.toString();
    }

    /**
     * Génère le bloc LaTeX pour les langues.
     */
    private String generateLanguages(List<SelectedLanguageDto> languages) {
        if (languages == null || languages.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < languages.size(); i++) {
            SelectedLanguageDto lang = languages.get(i);
            String name = escapeLatex(lang.getName());
            String level = escapeLatex(lang.getLevel());

            sb.append(name).append(" & \\normalsize{").append(level).append("}\\\\\n");
        }
        return sb.toString();
    }

    /**
     * Formate les dates pour l'affichage.
     */
    private String formatDates(String startDate, String endDate, boolean current) {
        if (startDate == null) {
            return "";
        }

        String start = formatDate(startDate);
        if (current || endDate == null) {
            return start + " -- Présent";
        }
        String end = formatDate(endDate);
        return start + " -- " + end;
    }

    /**
     * Formate une date ISO en format lisible (MM/YYYY).
     */
    private String formatDate(String isoDate) {
        if (isoDate == null || isoDate.isBlank()) {
            return "";
        }
        try {
            LocalDate date = LocalDate.parse(isoDate.substring(0, 10));
            return date.format(DateTimeFormatter.ofPattern("MM/yyyy", Locale.FRENCH));
        } catch (Exception e) {
            return isoDate;
        }
    }

    /**
     * Échappe les caractères spéciaux LaTeX. L'ordre est critique :
     * on remplace d'abord par des sentinelles uniques pour ne pas que
     * les substitutions suivantes (sur '{', '}', '\\') ne ré-échappent
     * les remplacements précédents.
     *
     * Caractères réellement spéciaux en LaTeX : \\ { } $ & # ^ _ ~ %
     */
    private String escapeLatex(String input) {
        if (input == null) {
            return "";
        }
        // 1) Sentinelles pour les caractères dont l'échappement contient à son tour
        //    des caractères spéciaux ('\\', '{', '}').
        String s = input
                .replace("\\", "\u0001BACKSLASH\u0001")
                .replace("~", "\u0001TILDE\u0001")
                .replace("^", "\u0001CARET\u0001");
        // 2) Échappements simples (un seul caractère préfixé par '\\').
        s = s
                .replace("&", "\\&")
                .replace("%", "\\%")
                .replace("$", "\\$")
                .replace("#", "\\#")
                .replace("_", "\\_")
                .replace("{", "\\{")
                .replace("}", "\\}");
        // 3) Résolution des sentinelles vers les commandes LaTeX correctes.
        s = s
                .replace("\u0001BACKSLASH\u0001", "\\textbackslash{}")
                .replace("\u0001TILDE\u0001", "\\textasciitilde{}")
                .replace("\u0001CARET\u0001", "\\textasciicircum{}");
        return s;
    }

    /**
     * Mappe l'entité GeneratedCvEntity vers SelectedCvContent.
     * Note: Cette méthode devrait être implémentée selon votre structure de données.
     */
    private SelectedCvContent mapEntityToDto(com.cvgen.backend.generation.infrastructure.persistence.entity.GeneratedCvEntity entity) {
        return SelectedCvContent.builder()
                .generatedCvId(entity.getId())
                .title(entity.getTitle())
                .summary(entity.getSummary())
                .experiences(readJsonList(entity.getExperiences(), new TypeReference<List<SelectedExperienceDto>>() {}))
                .educations(readJsonList(entity.getEducations(), new TypeReference<List<SelectedEducationDto>>() {}))
                .projects(readJsonList(entity.getProjects(), new TypeReference<List<SelectedProjectDto>>() {}))
                .skills(readJsonList(entity.getSkills(), new TypeReference<List<SelectedSkillDto>>() {}))
                .languages(readJsonList(entity.getLanguages(), new TypeReference<List<SelectedLanguageDto>>() {}))
                .certifications(readJsonList(entity.getCertifications(), new TypeReference<List<SelectedCertificationDto>>() {}))
                .build();
    }

    private <T> List<T> readJsonList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank() || "null".equals(json.trim())) {
            return Collections.emptyList();
        }
        try {
            List<T> list = objectMapper.readValue(json, typeRef);
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Impossible de désérialiser une section du CV généré : {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
