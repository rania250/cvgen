package com.cvgen.backend.profile.application;

import com.cvgen.backend.generation.infrastructure.gemini.GeminiClient;
import com.cvgen.backend.profile.api.dto.CreateCertificationRequest;
import com.cvgen.backend.profile.api.dto.CreateEducationRequest;
import com.cvgen.backend.profile.api.dto.CreateExperienceRequest;
import com.cvgen.backend.profile.api.dto.CreateLanguageRequest;
import com.cvgen.backend.profile.api.dto.CreateSkillRequest;
import com.cvgen.backend.profile.api.dto.ParsedCvDto;
import com.cvgen.backend.profile.api.dto.ParsedProjectDto;
import com.cvgen.backend.profile.api.dto.UpdateProfileRequest;
import com.cvgen.backend.profile.infrastructure.persistence.entity.LanguageLevel;
import com.cvgen.backend.profile.infrastructure.persistence.entity.SkillLevel;
import com.cvgen.backend.shared.config.GeminiProperties;
import com.cvgen.backend.shared.exception.FileProcessingException;
import com.cvgen.backend.shared.util.LenientJson;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Service d'analyse de CV basé sur l'IA Gemini.
 *
 * <p>Flux : texte brut (PDF/DOCX extrait via PDFBox/POI) → prompt structuré → Gemini
 * → JSON strict → mapping vers {@link ParsedCvDto}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CvParserService {

    private static final String SYSTEM_PROMPT = buildSystemPrompt();

    private final GeminiClient geminiClient;
    private final GeminiProperties geminiProperties;
    private final ObjectMapper objectMapper = LenientJson.mapper();

    /**
     * Parse un texte brut de CV via Gemini et retourne un DTO structuré.
     *
     * @param rawText le texte brut extrait du PDF/DOCX
     * @return ParsedCvDto contenant toutes les sections détectées
     */
    public ParsedCvDto parseCv(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            throw new FileProcessingException("Le texte extrait du CV est vide (fichier non lisible ou protégé).");
        }

        // Validation préliminaire de la clé API (évite un appel inutile et un message opaque)
        String apiKey = geminiProperties.apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new FileProcessingException(
                    "Clé API Gemini non configurée. Vérifiez la variable d'environnement GEMINI_API_KEY.");
        }

        String text = truncateIfTooLong(rawText.trim(), 16000);
        String prompt = SYSTEM_PROMPT + "\n\nCV à parser :\n" + text;

        try {
            // Température faible pour limiter l'hallucination sur des données factuelles.
            String response = geminiClient.generateContent(prompt, 0.2, 8192);
            String json = stripMarkdownFences(response);

            log.debug("Réponse brute Gemini ({} caractères) : {}", json.length(), json.substring(0, Math.min(200, json.length())));

            GeminiCvResponse gemini = objectMapper.readValue(json, GeminiCvResponse.class);
            ParsedCvDto dto = mapToDto(gemini);
            log.info("CV parsé via IA : {} expériences, {} formations, {} compétences, {} langues, {} certifications",
                    dto.getExperiences().size(), dto.getEducations().size(), dto.getSkills().size(),
                    dto.getLanguages().size(), dto.getCertifications().size());
            return dto;

        } catch (FileProcessingException e) {
            throw e; // Propager directement
        } catch (Exception e) {
            log.error("Erreur IA de parsing du CV : {}", e.getMessage(), e);
            throw new FileProcessingException(
                    "Le parsing IA du CV a échoué : " + e.getMessage() +
                            ". Vérifiez que la clé API Gemini est valide et que le fichier n'est pas corrompu.");
        }
    }

    private static String buildSystemPrompt() {
        return """
Tu es un parser de CV. Extrais les informations du CV suivant et retourne UNIQUEMENT un JSON valide, sans markdown, sans explication.

Structure JSON attendue :
{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "bio": "",
  "experiences": [
    {
      "title": "",
      "company": "",
      "location": "",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY ou null si en cours",
      "description": ["bullet 1", "bullet 2"]
    }
  ],
  "educations": [
    {
      "degree": "",
      "school": "",
      "location": "",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY ou null si en cours"
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "issueDate": "MM/YYYY ou null",
      "credentialUrl": ""
    }
  ],
  "skills": {
    "CATEGORIE": ["skill1", "skill2"]
  },
  "projects": [
    {
      "name": "",
      "description": ["bullet 1", "bullet 2"],
      "techStack": "",
      "url": "",
      "startDate": "MM/YYYY ou null",
      "endDate": "MM/YYYY ou null"
    }
  ],
  "languages": [
    {
      "language": "",
      "level": ""
    }
  ]
}

RÈGLES :
- N'invente AUCUNE donnée. Si un champ est absent, retourne une chaîne vide ou un tableau vide.
- startDate / endDate : utilise strictement le format MM/YYYY ou null. Pas d'autre format.
- description d'une expérience : retourne un tableau de bullet points, chacun en 1-2 phrases.
- skills : regroupe par catégorie générique (par ex. "Langages de programmation", "Frameworks", "Outils", "Bases de données", "Soft Skills"). Si tu n'es pas sûr, utilise "Général".
- languages : le niveau doit être A1, A2, B1, B2, C1, C2 ou NATIVE.
- certifications : recherche activement les sections intitulées "Certifications", "Certificats", "Licences", "Diplômes professionnels", "Professional Certificates", etc. N'omet pas cette section.
- projects : recherche activement les sections intitulées "Projets", "Projects", "Personal Projects", "Projets personnels", "Portfolio", etc. N'omet pas cette section. Pour chaque projet, extrais le nom, la description en bullet points, le stack technique, l'URL éventuelle et les dates.
- Réponse UNIQUEMENT en JSON, sans backticks.
""";
    }

    private ParsedCvDto emptyDto() {
        return ParsedCvDto.builder()
                .profileInfo(UpdateProfileRequest.builder().build())
                .experiences(Collections.emptyList())
                .educations(Collections.emptyList())
                .skills(Collections.emptyList())
                .languages(Collections.emptyList())
                .certifications(Collections.emptyList())
                .projects(Collections.emptyList())
                .build();
    }

    private String truncateIfTooLong(String text, int maxChars) {
        if (text.length() <= maxChars) return text;
        log.warn("Texte CV tronqué de {} à {} caractères avant envoi à Gemini", text.length(), maxChars);
        return text.substring(0, maxChars);
    }

    private String stripMarkdownFences(String raw) {
        if (raw == null) return "";
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    // ============================================================
    // Mapping GeminiCvResponse → ParsedCvDto
    // ============================================================

    private ParsedCvDto mapToDto(GeminiCvResponse g) {
        if (g == null) return emptyDto();

        // --- Profil (UpdateProfileRequest) ---
        UpdateProfileRequest.UpdateProfileRequestBuilder profileBuilder = UpdateProfileRequest.builder();
        if (g.bio != null && !g.bio.isBlank()) profileBuilder.summary(g.bio.trim());
        if (g.phone != null && !g.phone.isBlank()) profileBuilder.phone(g.phone.trim());
        if (g.location != null && !g.location.isBlank()) profileBuilder.location(g.location.trim());
        if (g.linkedin != null && !g.linkedin.isBlank()) profileBuilder.linkedinUrl(sanitizeUrl(g.linkedin.trim()));
        if (g.github != null && !g.github.isBlank()) profileBuilder.githubUrl(sanitizeUrl(g.github.trim()));
        if (g.portfolio != null && !g.portfolio.isBlank()) profileBuilder.portfolioUrl(sanitizeUrl(g.portfolio.trim()));
        // title : on le dérive du dernier poste si pas précisé explicitement.
        if (g.experiences != null && !g.experiences.isEmpty() && g.experiences.get(0).title != null) {
            profileBuilder.title(g.experiences.get(0).title.trim());
        }

        // --- Expériences ---
        List<CreateExperienceRequest> experiences = new ArrayList<>();
        if (g.experiences != null) {
            for (GeminiCvResponse.Exp e : g.experiences) {
                if (e.title == null || e.title.isBlank()) continue;
                String desc = joinBullets(e.description);
                CreateExperienceRequest req = CreateExperienceRequest.builder()
                        .jobTitle(e.title.trim())
                        .company(e.company != null ? e.company.trim() : "Entreprise non précisée")
                        .location(e.location != null ? e.location.trim() : null)
                        .startDate(parseDateOrDefault(e.startDate))
                        .endDate(parseDate(e.endDate))
                        .current(isCurrent(e.endDate))
                        .description(desc)
                        .displayOrder(experiences.size())
                        .build();
                experiences.add(req);
            }
        }

        // --- Éducations ---
        List<CreateEducationRequest> educations = new ArrayList<>();
        if (g.educations != null) {
            for (GeminiCvResponse.Edu e : g.educations) {
                if (e.school == null || e.school.isBlank()) continue;
                educations.add(CreateEducationRequest.builder()
                        .degree(e.degree != null ? e.degree.trim() : null)
                        .school(e.school.trim())
                        .fieldOfStudy(null)
                        .startDate(parseDateOrDefault(e.startDate))
                        .endDate(parseDate(e.endDate))
                        .description(null)
                        .displayOrder(educations.size())
                        .build());
            }
        }

        // --- Compétences (skills Map<String,List<String>> → flat list avec category) ---
        List<CreateSkillRequest> skills = new ArrayList<>();
        if (g.skills != null) {
            int order = 0;
            for (Map.Entry<String, List<String>> entry : g.skills.entrySet()) {
                String category = entry.getKey();
                for (String name : entry.getValue()) {
                    if (name == null || name.isBlank()) continue;
                    skills.add(CreateSkillRequest.builder()
                            .name(name.trim())
                            .level(SkillLevel.INTERMEDIATE)
                            .category(category != null ? category.trim() : null)
                            .displayOrder(order++)
                            .build());
                }
            }
        }

        // --- Langues ---
        List<CreateLanguageRequest> languages = new ArrayList<>();
        if (g.languages != null) {
            for (GeminiCvResponse.Lang l : g.languages) {
                if (l.language == null || l.language.isBlank()) continue;
                languages.add(CreateLanguageRequest.builder()
                        .name(l.language.trim())
                        .level(parseLanguageLevel(l.level))
                        .displayOrder(languages.size())
                        .build());
            }
        }

        // --- Certifications ---
        List<CreateCertificationRequest> certifications = new ArrayList<>();
        if (g.certifications != null) {
            for (GeminiCvResponse.Cert c : g.certifications) {
                if (c.name == null || c.name.isBlank()) continue;
                certifications.add(CreateCertificationRequest.builder()
                        .name(c.name.trim())
                        .issuer(c.issuer != null ? c.issuer.trim() : null)
                        .issueDate(parseDate(c.issueDate))
                        .credentialUrl(c.credentialUrl != null && !c.credentialUrl.isBlank()
                                ? sanitizeUrl(c.credentialUrl.trim()) : null)
                        .displayOrder(certifications.size())
                        .build());
            }
        }

        // --- Projets ---
        List<ParsedProjectDto> projects = new ArrayList<>();
        if (g.projects != null) {
            for (GeminiCvResponse.Proj p : g.projects) {
                if (p.name == null || p.name.isBlank()) continue;
                projects.add(ParsedProjectDto.builder()
                        .name(p.name.trim())
                        .description(joinBullets(p.description))
                        .techStack(p.techStack != null ? p.techStack.trim() : null)
                        .url(p.url != null && !p.url.isBlank() ? sanitizeUrl(p.url.trim()) : null)
                        .startDate(parseDate(p.startDate))
                        .endDate(parseDate(p.endDate))
                        .build());
            }
        }

        return ParsedCvDto.builder()
                .profileInfo(profileBuilder.build())
                .experiences(experiences)
                .educations(educations)
                .skills(skills)
                .languages(languages)
                .certifications(certifications)
                .projects(projects)
                .build();
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static final DateTimeFormatter[] DATE_FORMATTERS = {
            new DateTimeFormatterBuilder()
                    .appendPattern("MM/yyyy")
                    .parseDefaulting(ChronoField.DAY_OF_MONTH, 1)
                    .toFormatter(Locale.FRENCH),
            new DateTimeFormatterBuilder()
                    .appendPattern("M/yyyy")
                    .parseDefaulting(ChronoField.DAY_OF_MONTH, 1)
                    .toFormatter(Locale.FRENCH),
            new DateTimeFormatterBuilder()
                    .appendPattern("yyyy-MM")
                    .parseDefaulting(ChronoField.DAY_OF_MONTH, 1)
                    .toFormatter(Locale.FRENCH)
    };

    private static LocalDate parseDateOrDefault(String raw) {
        LocalDate d = parseDate(raw);
        return d != null ? d : LocalDate.now();
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim().toLowerCase(Locale.FRENCH);
        if (s.contains("présent") || s.contains("present") || s.contains("aujourd'hui") || s.contains("en cours")) return null;
        // "null" string envoyé par Gemini si en cours
        if (s.equals("null")) return null;
        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(s, fmt);
            } catch (Exception ignored) { }
        }
        return null;
    }

    private static boolean isCurrent(String rawEndDate) {
        if (rawEndDate == null || rawEndDate.isBlank()) return true;
        String s = rawEndDate.trim().toLowerCase(Locale.FRENCH);
        return s.contains("présent") || s.contains("present") || s.contains("aujourd'hui")
                || s.contains("en cours") || s.equals("null");
    }

    private static String joinBullets(List<String> bullets) {
        if (bullets == null || bullets.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        for (String b : bullets) {
            if (b == null || b.isBlank()) continue;
            if (sb.length() > 0) sb.append("\n");
            sb.append("• ").append(b.trim());
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    private static LanguageLevel parseLanguageLevel(String raw) {
        if (raw == null || raw.isBlank()) return LanguageLevel.B1;
        switch (raw.trim().toUpperCase(Locale.FRENCH)) {
            case "A1": return LanguageLevel.A1;
            case "A2": return LanguageLevel.A2;
            case "B1": return LanguageLevel.B1;
            case "B2": return LanguageLevel.B2;
            case "C1": return LanguageLevel.C1;
            case "C2": return LanguageLevel.C2;
            case "NATIVE": case "NATIF": case "MATERNELLE": case "MOTHER_TONGUE": case "LANGUE MATERNELLE":
                return LanguageLevel.NATIVE;
            default: return LanguageLevel.B1;
        }
    }

    private static String sanitizeUrl(String url) {
        if (url == null) return null;
        String s = url.trim();
        // Supprimer le suffixe de ponctuation qui s'est peut-être glissé dans le texte brut.
        s = s.replaceAll("[.,;)]$", "");
        if (!s.toLowerCase(Locale.FRENCH).startsWith("http")) {
            if (s.contains("linkedin.com")) return "https://" + s;
            if (s.contains("github.com")) return "https://" + s;
        }
        return s;
    }

    // ============================================================
    // DTO interne (mapping direct JSON ↔ champs)
    // ============================================================

    @SuppressWarnings("unused")
    private static class GeminiCvResponse {
        public String firstName;
        public String lastName;
        public String email;
        public String phone;
        public String location;
        public String linkedin;
        public String github;
        public String portfolio;
        public String bio;
        public List<Exp> experiences;
        public List<Edu> educations;
        public List<Cert> certifications;
        public LinkedHashMap<String, List<String>> skills;
        public List<Lang> languages;
        public List<Proj> projects;

        @SuppressWarnings("unused")
        public static class Exp {
            public String title;
            public String company;
            public String location;
            public String startDate;
            public String endDate;
            public List<String> description;
        }

        @SuppressWarnings("unused")
        public static class Edu {
            public String degree;
            public String school;
            public String location;
            public String startDate;
            public String endDate;
        }

        @SuppressWarnings("unused")
        public static class Cert {
            public String name;
            public String issuer;
            public String issueDate;
            public String credentialUrl;
        }

        @SuppressWarnings("unused")
        public static class Lang {
            public String language;
            public String level;
        }

        @SuppressWarnings("unused")
        public static class Proj {
            public String name;
            public List<String> description;
            public String techStack;
            public String url;
            public String startDate;
            public String endDate;
        }
    }
}
