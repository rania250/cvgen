package com.cvgen.backend.profile.application;

import com.cvgen.backend.profile.api.dto.CreateEducationRequest;
import com.cvgen.backend.profile.api.dto.CreateExperienceRequest;
import com.cvgen.backend.profile.api.dto.CreateLanguageRequest;
import com.cvgen.backend.profile.api.dto.CreateSkillRequest;
import com.cvgen.backend.profile.api.dto.ParsedCvDto;
import com.cvgen.backend.profile.api.dto.UpdateProfileRequest;
import com.cvgen.backend.profile.infrastructure.persistence.entity.LanguageLevel;
import com.cvgen.backend.profile.infrastructure.persistence.entity.SkillLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service d'analyse intelligente du texte brut d'un CV.
 * Utilise des expressions régulières et des mots-clés pour détecter et extraire
 * chaque section : expériences, formations, compétences, langues, informations générales.
 */
@Slf4j
@Service
public class CvParserService {

    // =====================================================
    // Patterns de détection de sections
    // =====================================================

    private static final Pattern EXPERIENCE_SECTION_PATTERN = Pattern.compile(
            "(?i)(?:^|\\n)(?:\\s*)(?:expérience|experience|parcours professionnel|emploi|poste|professional experience|work experience|employment|career|positions?)\\s*(?:professionnel|professionals?)?\\s*[\\n:]|\\b(?:expériences?|experiences?)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern EDUCATION_SECTION_PATTERN = Pattern.compile(
            "(?i)(?:^|\\n)(?:\\s*)(?:formation|éducation|education|diplôme|diplomas?|études|étude|université|university|master|licence|bac|baccalauréat|degree|academic|schooling|scholastic)\\s*[\\n:]|\\b(?:formations?)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern SKILLS_SECTION_PATTERN = Pattern.compile(
            "(?i)(?:^|\\n)(?:\\s*)(?:compétences?|skills?|technologies?|outils?|langages?|tools?|technical skills|hard skills|software|stack|expertise)\\s*[\\n:]|\\b(?:compétences?)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern LANGUAGES_SECTION_PATTERN = Pattern.compile(
            "(?i)(?:^|\\n)(?:\\s*)(?:langues?|languages?)\\s*[\\n:]|\\b(?:langues?)\\b",
            Pattern.CASE_INSENSITIVE);

    // =====================================================
    // Patterns de dates
    // =====================================================

    private static final Pattern DATE_PATTERN = Pattern.compile(
            "(?i)(?:(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2,4})|(\\d{1,2})[/-](\\d{4})|" +
            "(janv|févr?|mars|avr|mai|juin|juil|août|sept?|oct|nov|déc)[a-z]*\\s*(\\d{4})|" +
            "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s*(\\d{4}))" +
            "(?:\\s*[-àa~]\\s*|\\s+to\\s+)?" +
            "(?:(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2,4})|(\\d{1,2})[/-](\\d{4})|" +
            "(janv|févr?|mars|avr|mai|juin|juil|août|sept?|oct|nov|déc)[a-z]*\\s*(\\d{4})|" +
            "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s*(\\d{4})|" +
            "(présent|aujourd'hui|current|now|present|en cours|ongoing))?",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern CURRENT_DATE_PATTERN = Pattern.compile(
            "(?i)(présent|aujourd'hui|current|now|present|en cours|ongoing|today)",
            Pattern.CASE_INSENSITIVE);

    // =====================================================
    // Patterns de contact et liens
    // =====================================================

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?i)(?:tél|tel|téléphone|phone|mobile|portable)?[\\s:.]*" +
            "((?:(?:\\+33|0033|0)[\\s.]?(?:[1-9](?:[\\s.]?\\d{2}){4}))|" +
            "(?:\\+?[1-9]\\d{0,2}[\\s.-]?\\(?\\d{1,4}\\)?[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,9}))",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "\\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})\\b");

    private static final Pattern LINKEDIN_PATTERN = Pattern.compile(
            "(?i)(?:linkedin\\.com/in/|linkedin\\s*:\\s*)([a-z0-9-]+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern GITHUB_PATTERN = Pattern.compile(
            "(?i)(?:github\\.com/|github\\s*:\\s*)([a-z0-9-]+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern LOCATION_PATTERN = Pattern.compile(
            "(?i)(?:(?:adresse|address|localisation|location|ville|city|résidence)\\s*[:\\-]?\\s*)?" +
            "([A-Z][a-zA-ZéèêàùïöüçÉÈÊÀÙÏÖÜÇ]+(?:\\s+[A-Z][a-zA-ZéèêàùïöüçÉÈÊÀÙÏÖÜÇ]+)*" +
            "(?:\\s*,?\\s*(?:\\d{2}\\s?\\d{3}|\\d{5}|France|Paris|Lyon|Marseille|Bordeaux|Nantes|Strasbourg|" +
            "Toulouse|Nice|Lille|Rennes|Montpellier|Grenoble|Bruxelles|Genève|Montréal|Québec))?)",
            Pattern.CASE_INSENSITIVE);

    // =====================================================
    // Dictionnaires de catégorisation des compétences
    // =====================================================

    private static final Map<String, Set<String>> SKILL_CATEGORIES = new HashMap<>();
    private static final Set<String> KNOWN_SKILLS = new HashSet<>();

    static {
        // Backend
        SKILL_CATEGORIES.put("Backend", Set.of(
            "java", "python", "c++", "c#", "go", "golang", "rust", "ruby", "php", "nodejs", "node",
            "spring", "spring boot", "django", "flask", "express", "nestjs", "laravel", "symfony",
            "hibernate", "jpa", "jdbc", "rest", "restful", "api", "graphql", "soap", "json", "xml"
        ));

        // Frontend
        SKILL_CATEGORIES.put("Frontend", Set.of(
            "react", "reactjs", "vue", "vuejs", "angular", "angularjs", "svelte", "nextjs", "nuxt",
            "html", "html5", "css", "css3", "javascript", "typescript", "js", "ts", "jsx", "tsx",
            "bootstrap", "tailwind", "tailwindcss", "sass", "scss", "less", "webpack", "vite",
            "jquery", "redux", "zustand", "mobx", "dom"
        ));

        // DevOps
        SKILL_CATEGORIES.put("DevOps", Set.of(
            "docker", "kubernetes", "k8s", "aws", "amazon web services", "gcp", "google cloud",
            "azure", "jenkins", "gitlab ci", "github actions", "ci/cd", "cicd", "terraform",
            "ansible", "puppet", "chef", "nginx", "apache", "linux", "ubuntu", "debian",
            "centos", "redhat", "bash", "shell", "powershell", "git", "github", "gitlab",
            "bitbucket", "prometheus", "grafana", "elk", "monitoring"
        ));

        // Base de données
        SKILL_CATEGORIES.put("Base de données", Set.of(
            "sql", "mysql", "postgresql", "postgres", "oracle", "sqlserver", "sqlite",
            "mongodb", "mongo", "redis", "cassandra", "couchdb", "dynamodb", "firebase",
            "elasticsearch", "neo4j", "mariadb", "nosql", "pl/sql", "tsql"
        ));

        // Mobile
        SKILL_CATEGORIES.put("Mobile", Set.of(
            "android", "ios", "swift", "kotlin", "react native", "flutter", "dart",
            "xamarin", "cordova", "ionic", "objective-c", "mobile"
        ));

        // Data / AI
        SKILL_CATEGORIES.put("Data / IA", Set.of(
            "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "keras",
            "scikit-learn", "sklearn", "pandas", "numpy", "matplotlib", "seaborn",
            "jupyter", "r", "scala", "spark", "hadoop", "kafka", "airflow", "dbt",
            "tableau", "powerbi", "power bi", "data science", "data analysis"
        ));

        // Populate known skills
        SKILL_CATEGORIES.values().forEach(KNOWN_SKILLS::addAll);
    }

    // =====================================================
    // Dictionnaires de langues et niveaux
    // =====================================================

    private static final Map<String, String> LANGUAGE_NAMES = new HashMap<>();
    private static final Map<String, LanguageLevel> LANGUAGE_LEVELS = new HashMap<>();

    static {
        // Langues
        LANGUAGE_NAMES.put("français", "Français");
        LANGUAGE_NAMES.put("francais", "Français");
        LANGUAGE_NAMES.put("french", "Français");
        LANGUAGE_NAMES.put("anglais", "Anglais");
        LANGUAGE_NAMES.put("english", "Anglais");
        LANGUAGE_NAMES.put("arabe", "Arabe");
        LANGUAGE_NAMES.put("arabic", "Arabe");
        LANGUAGE_NAMES.put("espagnol", "Espagnol");
        LANGUAGE_NAMES.put("spanish", "Espagnol");
        LANGUAGE_NAMES.put("allemand", "Allemand");
        LANGUAGE_NAMES.put("german", "Allemand");
        LANGUAGE_NAMES.put("italien", "Italien");
        LANGUAGE_NAMES.put("italian", "Italien");
        LANGUAGE_NAMES.put("portugais", "Portugais");
        LANGUAGE_NAMES.put("portuguese", "Portugais");
        LANGUAGE_NAMES.put("chinois", "Chinois");
        LANGUAGE_NAMES.put("chinese", "Chinois");
        LANGUAGE_NAMES.put("mandarin", "Chinois");
        LANGUAGE_NAMES.put("japonais", "Japonais");
        LANGUAGE_NAMES.put("japanese", "Japonais");
        LANGUAGE_NAMES.put("russe", "Russe");
        LANGUAGE_NAMES.put("russian", "Russe");
        LANGUAGE_NAMES.put("néerlandais", "Néerlandais");
        LANGUAGE_NAMES.put("dutch", "Néerlandais");

        // Niveaux
        LANGUAGE_LEVELS.put("natif", LanguageLevel.NATIVE);
        LANGUAGE_LEVELS.put("native", LanguageLevel.NATIVE);
        LANGUAGE_LEVELS.put("bilingue", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("bilingual", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("courant", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("fluent", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("maîtrise", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("maitrise", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("c2", LanguageLevel.C2);
        LANGUAGE_LEVELS.put("c1", LanguageLevel.C1);
        LANGUAGE_LEVELS.put("professionnel", LanguageLevel.C1);
        LANGUAGE_LEVELS.put("professional", LanguageLevel.C1);
        LANGUAGE_LEVELS.put("autonome", LanguageLevel.B2);
        LANGUAGE_LEVELS.put("independent", LanguageLevel.B2);
        LANGUAGE_LEVELS.put("intermédiaire", LanguageLevel.B2);
        LANGUAGE_LEVELS.put("intermediaire", LanguageLevel.B2);
        LANGUAGE_LEVELS.put("intermediate", LanguageLevel.B2);
        LANGUAGE_LEVELS.put("b2", LanguageLevel.B2);
        LANGUAGE_LEVELS.put("b1", LanguageLevel.B1);
        LANGUAGE_LEVELS.put("seuil", LanguageLevel.B1);
        LANGUAGE_LEVELS.put("threshold", LanguageLevel.B1);
        LANGUAGE_LEVELS.put("notions", LanguageLevel.A2);
        LANGUAGE_LEVELS.put("basique", LanguageLevel.A2);
        LANGUAGE_LEVELS.put("basic", LanguageLevel.A2);
        LANGUAGE_LEVELS.put("a2", LanguageLevel.A2);
        LANGUAGE_LEVELS.put("débutant", LanguageLevel.A1);
        LANGUAGE_LEVELS.put("debutant", LanguageLevel.A1);
        LANGUAGE_LEVELS.put("beginner", LanguageLevel.A1);
        LANGUAGE_LEVELS.put("a1", LanguageLevel.A1);
    }

    // =====================================================
    // Méthode principale de parsing
    // =====================================================

    /**
     * Parse le texte brut d'un CV et extrait les informations structurées.
     *
     * @param rawText le texte brut extrait du PDF/DOCX
     * @return ParsedCvDto contenant toutes les sections détectées
     */
    public ParsedCvDto parseCv(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return ParsedCvDto.builder()
                    .profileInfo(UpdateProfileRequest.builder().build())
                    .experiences(List.of())
                    .educations(List.of())
                    .skills(List.of())
                    .languages(List.of())
                    .build();
        }

        String normalizedText = normalizeText(rawText);

        UpdateProfileRequest profileInfo = extractGeneralInfo(normalizedText);
        List<CreateExperienceRequest> experiences = extractExperiences(normalizedText);
        List<CreateEducationRequest> educations = extractEducations(normalizedText);
        List<CreateSkillRequest> skills = extractSkills(normalizedText);
        List<CreateLanguageRequest> languages = extractLanguages(normalizedText);

        return ParsedCvDto.builder()
                .profileInfo(profileInfo)
                .experiences(experiences)
                .educations(educations)
                .skills(skills)
                .languages(languages)
                .build();
    }

    // =====================================================
    // Normalisation du texte
    // =====================================================

    private String normalizeText(String text) {
        return text
                .replaceAll("\\r\\n", "\n")
                .replaceAll("\\r", "\n")
                .replaceAll("[\\t]+", " ")
                .replaceAll("[ ]{2,}", " ")
                .trim();
    }

    // =====================================================
    // Extraction des informations générales
    // =====================================================

    private UpdateProfileRequest extractGeneralInfo(String text) {
        UpdateProfileRequest.UpdateProfileRequestBuilder builder = UpdateProfileRequest.builder();

        // Titre (première ligne qui ressemble à un titre de poste)
        String title = extractTitle(text);
        if (title != null) {
            builder.title(title);
        }

        // Résumé / accroche
        String summary = extractSummary(text);
        if (summary != null) {
            builder.summary(summary);
        }

        // Téléphone
        Matcher phoneMatcher = PHONE_PATTERN.matcher(text);
        if (phoneMatcher.find()) {
            builder.phone(phoneMatcher.group(1).trim());
        }

        // LinkedIn
        Matcher linkedinMatcher = LINKEDIN_PATTERN.matcher(text);
        if (linkedinMatcher.find()) {
            builder.linkedinUrl("https://linkedin.com/in/" + linkedinMatcher.group(1));
        }

        // GitHub
        Matcher githubMatcher = GITHUB_PATTERN.matcher(text);
        if (githubMatcher.find()) {
            builder.githubUrl("https://github.com/" + githubMatcher.group(1));
        }

        // Localisation (ville/code postal)
        String location = extractLocation(text);
        if (location != null) {
            builder.location(location);
        }

        return builder.build();
    }

    private String extractTitle(String text) {
        String[] lines = text.split("\\n");

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            // Éviter les lignes qui sont des titres de section
            if (isSectionHeader(line)) continue;

            // Éviter les noms (majuscules avec espaces)
            if (line.matches("^[A-ZÉÈÊÀÙÏÖÜÇ\\s]{3,}$")) continue;

            // Chercher un titre de poste (2-5 mots, contient souvent des termes techniques)
            if (line.matches("(?i).*(?:développeur|developer|engineer|ingénieur|architect|lead|" +
                    "manager|chef|consultant|analyst|administrator|admin|technicien|technician|" +
                    "designer|product|project|scrum|master|devops|full.?stack|front.?end|back.?end|" +
                    "web|mobile|data|cloud|security|réseau|network|support|stagiaire|intern).{0,50}")) {
                if (line.length() <= 100) {
                    return capitalizeFirst(line);
                }
            }

            // Si la ligne est courte et a l'air professionnelle
            if (line.length() >= 5 && line.length() <= 60 && line.matches("[A-Za-zÀ-ÿ\\s/-]+")) {
                return capitalizeFirst(line);
            }
        }

        return null;
    }

    private String extractSummary(String text) {
        String[] lines = text.split("\\n");
        StringBuilder summary = new StringBuilder();
        boolean inSummary = false;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();

            if (line.isEmpty()) {
                if (inSummary && summary.length() > 50) {
                    break;
                }
                continue;
            }

            // Détecter le début d'un résumé (après le nom, avant les sections)
            if (!inSummary && line.length() > 50 && !isSectionHeader(line) && !isContactInfo(line)) {
                // Vérifier que ce n'est pas juste une ligne de coordonnées
                if (!line.matches(".*\\d{5}.*") && !line.contains("@")) {
                    inSummary = true;
                    summary.append(line).append(" ");
                }
            } else if (inSummary) {
                if (isSectionHeader(line)) {
                    break;
                }
                if (summary.length() < 500) {
                    summary.append(line).append(" ");
                }
            }
        }

        String result = summary.toString().trim();
        return result.length() > 20 ? result : null;
    }

    private String extractLocation(String text) {
        // Chercher des patterns comme "Paris 75001" ou "Lyon, France"
        Pattern frenchLocation = Pattern.compile(
            "([A-Z][a-zA-ZéèêàùïöüçÉÈÊÀÙÏÖÜÇ]+(?:\\s+[A-Z][a-zA-ZéèêàùïöüçÉÈÊÀÙÏÖÜÇ]+)*)\\s*,?\\s*(?:\\d{5}|France)",
            Pattern.CASE_INSENSITIVE);

        Matcher matcher = frenchLocation.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        // Chercher après des mots-clés
        Matcher locationMatcher = LOCATION_PATTERN.matcher(text);
        if (locationMatcher.find()) {
            String loc = locationMatcher.group(1).trim();
            if (loc.length() > 2 && !loc.toLowerCase().contains("email")) {
                return loc;
            }
        }

        return null;
    }

    private boolean isSectionHeader(String line) {
        String lower = line.toLowerCase();
        return lower.matches(".*(?:expérience|experience|formation|éducation|education|compétence|skill|" +
                "langue|language|projet|project|intérêt|interest|référence|reference|certification|diplôme).*");
    }

    private boolean isContactInfo(String line) {
        return line.contains("@") || PHONE_PATTERN.matcher(line).find() ||
               line.toLowerCase().contains("linkedin") || line.toLowerCase().contains("github");
    }

    // =====================================================
    // Extraction des expériences
    // =====================================================

    private List<CreateExperienceRequest> extractExperiences(String text) {
        List<CreateExperienceRequest> experiences = new ArrayList<>();

        // Trouver la section expériences
        Matcher sectionMatcher = EXPERIENCE_SECTION_PATTERN.matcher(text);
        if (!sectionMatcher.find()) {
            return experiences;
        }

        int startIdx = sectionMatcher.end();

        // Trouver la fin de la section (prochaine section majeure ou fin du texte)
        int endIdx = findSectionEnd(text, startIdx);
        String sectionText = text.substring(startIdx, endIdx);

        // Parser les blocs d'expériences
        String[] blocks = sectionText.split("\\n\\n+|(?=\\n[A-Z])");

        for (String block : blocks) {
            block = block.trim();
            if (block.isEmpty() || block.length() < 20) continue;

            // Éviter les lignes qui sont des titres de section
            if (isSectionHeader(block.split("\\n")[0])) continue;

            CreateExperienceRequest exp = parseExperienceBlock(block);
            if (exp != null && exp.getJobTitle() != null && !exp.getJobTitle().isEmpty()) {
                experiences.add(exp);
            }
        }

        return experiences;
    }

    private CreateExperienceRequest parseExperienceBlock(String block) {
        String[] lines = block.split("\\n");
        if (lines.length < 1) return null;

        CreateExperienceRequest.CreateExperienceRequestBuilder builder = CreateExperienceRequest.builder();

        // Première ligne = titre du poste
        String jobTitle = lines[0].trim();
        if (jobTitle.isEmpty() || isSectionHeader(jobTitle)) return null;
        builder.jobTitle(capitalizeFirst(jobTitle));

        // Deuxième ligne = entreprise (ou sur la même ligne séparée par |, -, , chez, at)
        String company = null;
        if (lines.length > 1) {
            String line2 = lines[1].trim();
            if (!isDateLine(line2) && !isSectionHeader(line2)) {
                company = extractCompany(line2);
            }
        }

        // Chercher aussi dans la première ligne si format "Développeur chez Company"
        if (company == null) {
            company = extractCompanyFromTitle(jobTitle);
        }

        if (company != null) {
            builder.company(company);
        } else {
            builder.company("Entreprise non précisée");
        }

        // Dates
        String dateLine = findDateLine(block);
        if (dateLine != null) {
            DateRange range = parseDateRange(dateLine);
            if (range != null) {
                builder.startDate(range.start);
                builder.endDate(range.end);
                builder.current(range.isCurrent);
            }
        }

        // Description = reste du bloc
        StringBuilder description = new StringBuilder();
        for (int i = 2; i < lines.length; i++) {
            String line = lines[i].trim();
            if (!line.isEmpty() && !isDateLine(line)) {
                description.append(line).append(" ");
            }
        }
        if (description.length() > 0) {
            builder.description(description.toString().trim());
        }

        return builder.build();
    }

    private String extractCompany(String line) {
        // Patterns : "chez Company", "at Company", "| Company", "- Company", ", Company"
        Pattern[] patterns = {
            Pattern.compile("(?i)(?:chez|at|@)\\s+([^|,-]+)"),
            Pattern.compile("(?i)^[^|]+[|]\\s*([^,-]+)"),
            Pattern.compile("(?i)^[^-]+[-]\\s*([^,]+)"),
            Pattern.compile("(?i)^[^,]+,\\s*([^-]+)")
        };

        for (Pattern p : patterns) {
            Matcher m = p.matcher(line);
            if (m.find()) {
                return capitalizeFirst(m.group(1).trim());
            }
        }

        // Si aucun pattern ne match, la ligne entière est peut-être l'entreprise
        if (line.length() < 100 && !isDateLine(line)) {
            return capitalizeFirst(line);
        }

        return null;
    }

    private String extractCompanyFromTitle(String title) {
        Pattern pattern = Pattern.compile("(?i)(?:chez|at|@)\\s+(.+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(title);
        if (matcher.find()) {
            return capitalizeFirst(matcher.group(1).trim());
        }
        return null;
    }

    private boolean isDateLine(String line) {
        return DATE_PATTERN.matcher(line).find() ||
               line.matches("(?i).*(?:\\d{4}|jan|feb|mar|avr|mai|jun|juil|août|sept|oct|nov|déc).*");
    }

    private String findDateLine(String block) {
        String[] lines = block.split("\\n");
        for (String line : lines) {
            if (DATE_PATTERN.matcher(line).find()) {
                return line;
            }
        }
        return null;
    }

    private DateRange parseDateRange(String text) {
        // Formats supportés:
        // - 01/01/2020 - 31/12/2022
        // - Jan 2020 - Déc 2022
        // - 2020 - 2022
        // - 2020 - présent

        Pattern dateRangePattern = Pattern.compile(
            "(?i)(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}[/-]\\d{4}|" +
            "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janv|févr?|mars|avr|mai|juin|juil|août|sept?|oct|nov|déc)[a-z]*\\s*\\d{4}|" +
            "\\d{4})" +
            "\\s*[-àa~]+\\s*" +
            "(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}[/-]\\d{4}|" +
            "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janv|févr?|mars|avr|mai|juin|juil|août|sept?|oct|nov|déc)[a-z]*\\s*\\d{4}|" +
            "\\d{4}|présent|aujourd'hui|current|now|present|en cours|ongoing|today)"
        );

        Matcher matcher = dateRangePattern.matcher(text);
        if (matcher.find()) {
            LocalDate start = parseDate(matcher.group(1));
            String endStr = matcher.group(2);
            boolean isCurrent = CURRENT_DATE_PATTERN.matcher(endStr).find();
            LocalDate end = isCurrent ? null : parseDate(endStr);

            if (start != null || end != null || isCurrent) {
                return new DateRange(start, end, isCurrent);
            }
        }

        // Essayer de parser une année seule
        Pattern yearPattern = Pattern.compile("\\b(20\\d{2})\\b");
        Matcher yearMatcher = yearPattern.matcher(text);
        List<Integer> years = new ArrayList<>();
        while (yearMatcher.find()) {
            years.add(Integer.parseInt(yearMatcher.group(1)));
        }
        if (years.size() >= 2) {
            return new DateRange(
                LocalDate.of(years.get(0), 1, 1),
                LocalDate.of(years.get(years.size() - 1), 12, 31),
                false
            );
        } else if (years.size() == 1) {
            return new DateRange(
                LocalDate.of(years.get(0), 1, 1),
                null,
                true
            );
        }

        return null;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;

        dateStr = dateStr.trim().toLowerCase();

        // Année seule
        if (dateStr.matches("\\d{4}")) {
            return LocalDate.of(Integer.parseInt(dateStr), 1, 1);
        }

        // MM/YYYY ou M/YYYY
        try {
            if (dateStr.matches("\\d{1,2}/\\d{4}")) {
                String[] parts = dateStr.split("/");
                return LocalDate.of(Integer.parseInt(parts[1]), Integer.parseInt(parts[0]), 1);
            }
        } catch (Exception ignored) {}

        // DD/MM/YYYY
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d/M/yyyy");
            return LocalDate.parse(dateStr, formatter);
        } catch (DateTimeParseException ignored) {}

        // Mois en français ou anglais + année
        Map<String, Integer> months = new HashMap<>();
        months.put("jan", 1); months.put("janv", 1);
        months.put("feb", 2); months.put("fév", 2); months.put("févr", 2);
        months.put("mar", 3); months.put("mars", 3);
        months.put("apr", 4); months.put("avr", 4);
        months.put("may", 5); months.put("mai", 5);
        months.put("jun", 6); months.put("juin", 6);
        months.put("jul", 7); months.put("juil", 7);
        months.put("aug", 8); months.put("août", 8);
        months.put("sep", 9); months.put("sept", 9);
        months.put("oct", 10); months.put("nov", 11); months.put("déc", 12); months.put("dec", 12);

        Pattern monthYearPattern = Pattern.compile("(\\w+)\\s*(\\d{4})");
        Matcher matcher = monthYearPattern.matcher(dateStr);
        if (matcher.find()) {
            String month = matcher.group(1).toLowerCase().substring(0, 3);
            Integer monthNum = months.get(month);
            if (monthNum != null) {
                return LocalDate.of(Integer.parseInt(matcher.group(2)), monthNum, 1);
            }
        }

        return null;
    }

    private record DateRange(LocalDate start, LocalDate end, boolean isCurrent) {}

    // =====================================================
    // Extraction des formations
    // =====================================================

    private List<CreateEducationRequest> extractEducations(String text) {
        List<CreateEducationRequest> educations = new ArrayList<>();

        Matcher sectionMatcher = EDUCATION_SECTION_PATTERN.matcher(text);
        if (!sectionMatcher.find()) {
            return educations;
        }

        int startIdx = sectionMatcher.end();
        int endIdx = findSectionEnd(text, startIdx);
        String sectionText = text.substring(startIdx, endIdx);

        String[] blocks = sectionText.split("\\n\\n+|(?=\\n[A-Z])");

        for (String block : blocks) {
            block = block.trim();
            if (block.isEmpty() || block.length() < 15) continue;
            if (isSectionHeader(block.split("\\n")[0])) continue;

            CreateEducationRequest edu = parseEducationBlock(block);
            if (edu != null && edu.getSchool() != null && !edu.getSchool().isEmpty()) {
                educations.add(edu);
            }
        }

        return educations;
    }

    private CreateEducationRequest parseEducationBlock(String block) {
        String[] lines = block.split("\\n");
        if (lines.length < 1) return null;

        CreateEducationRequest.CreateEducationRequestBuilder builder = CreateEducationRequest.builder();

        // Première ligne = diplôme ou école
        String line1 = lines[0].trim();
        String line2 = lines.length > 1 ? lines[1].trim() : "";

        // Détecter si c'est un diplôme ou une école
        if (looksLikeDegree(line1)) {
            builder.degree(line1);
            if (!line2.isEmpty() && !isDateLine(line2)) {
                builder.school(line2);
            }
        } else {
            builder.school(line1);
            if (!line2.isEmpty() && looksLikeDegree(line2)) {
                builder.degree(line2);
            }
        }

        // Domaine d'étude (souvent après le diplôme)
        for (String line : lines) {
            if (line.toLowerCase().contains("spécialité") ||
                line.toLowerCase().contains("mention") ||
                line.matches("(?i).*(?:informatique|génie|science|management|commerce|droit|médecine).*")) {
                builder.fieldOfStudy(line.replaceAll("(?i)spécialité\\s*:", "").trim());
                break;
            }
        }

        // Dates
        String dateLine = findDateLine(block);
        if (dateLine != null) {
            DateRange range = parseDateRange(dateLine);
            if (range != null) {
                builder.startDate(range.start);
                builder.endDate(range.end);
            }
        }

        // Description
        StringBuilder desc = new StringBuilder();
        for (int i = 2; i < lines.length; i++) {
            String line = lines[i].trim();
            if (!line.isEmpty() && !isDateLine(line)) {
                desc.append(line).append(" ");
            }
        }
        if (desc.length() > 0) {
            builder.description(desc.toString().trim());
        }

        // Si pas d'école trouvée, ignorer
        if (builder.build().getSchool() == null) {
            return null;
        }

        return builder.build();
    }

    private boolean looksLikeDegree(String text) {
        String lower = text.toLowerCase();
        return lower.matches(".*(?:master|licence|bachelor|bac|bts|dut|deug|deust|" +
                "diplôme|degree|certificat|certification|mba|phd|doctorat|ingénieur).*") ||
               lower.matches("(?i).*(?:bac\\s*\\+\\d+|niveau\\s*\\w+|grade\\s*\\w+).*");
    }

    // =====================================================
    // Extraction des compétences
    // =====================================================

    private List<CreateSkillRequest> extractSkills(String text) {
        List<CreateSkillRequest> skills = new ArrayList<>();
        Set<String> foundSkills = new HashSet<>();

        Matcher sectionMatcher = SKILLS_SECTION_PATTERN.matcher(text);
        if (!sectionMatcher.find()) {
            // Essayer de trouver des compétences dispersées dans tout le texte
            return extractSkillsFromFullText(text);
        }

        int startIdx = sectionMatcher.end();
        int endIdx = findSectionEnd(text, startIdx);
        String sectionText = text.substring(startIdx, endIdx);

        // Parser les listes de compétences (virgules, tirets, puces, barres)
        String[] lines = sectionText.split("\\n");

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || isSectionHeader(line)) continue;

            // Supprimer les préfixes de liste
            line = line.replaceAll("^[•\\-\\*\\+\\/]\\s*", "");

            // Séparer par virgules, slashs, barres
            String[] items = line.split("[,;/|]");

            for (String item : items) {
                item = item.trim();
                if (item.isEmpty()) continue;

                // Nettoyer et normaliser
                String skillName = normalizeSkillName(item);
                if (skillName.length() < 2 || skillName.length() > 50) continue;
                if (foundSkills.contains(skillName.toLowerCase())) continue;

                // Vérifier que c'est un skill connu ou plausible
                if (isKnownOrPlausibleSkill(skillName)) {
                    foundSkills.add(skillName.toLowerCase());
                    skills.add(CreateSkillRequest.builder()
                            .name(skillName)
                            .level(SkillLevel.INTERMEDIATE)
                            .category(categorizeSkill(skillName))
                            .build());
                }
            }
        }

        return skills;
    }

    private List<CreateSkillRequest> extractSkillsFromFullText(String text) {
        List<CreateSkillRequest> skills = new ArrayList<>();
        Set<String> foundSkills = new HashSet<>();

        // Chercher les mots qui correspondent à des compétences connues
        String[] words = text.split("[\\s,;/|\\(\\)\\[\\]{}]+");

        for (String word : words) {
            word = word.trim().toLowerCase();
            if (word.length() < 2 || word.length() > 30) continue;

            String normalized = normalizeSkillName(word);
            if (KNOWN_SKILLS.contains(normalized.toLowerCase()) &&
                !foundSkills.contains(normalized.toLowerCase())) {
                foundSkills.add(normalized.toLowerCase());
                skills.add(CreateSkillRequest.builder()
                        .name(normalized)
                        .level(SkillLevel.INTERMEDIATE)
                        .category(categorizeSkill(normalized))
                        .build());
            }
        }

        return skills;
    }

    private String normalizeSkillName(String name) {
        return name.trim()
                .replaceAll("^\\W+|\\W+$", "")  // Supprimer ponctuation
                .replaceAll("\\s+", " ")         // Normaliser espaces
                .trim();
    }

    private boolean isKnownOrPlausibleSkill(String name) {
        String lower = name.toLowerCase();

        // Vérifier dans les catégories connues
        for (Set<String> skills : SKILL_CATEGORIES.values()) {
            for (String skill : skills) {
                if (skill.equalsIgnoreCase(lower) || lower.contains(skill)) {
                    return true;
                }
            }
        }

        // Heuristiques pour détecter un skill plausible
        return lower.matches("^[a-z]+\\d*$") ||  // java, python3
               lower.matches("^\\w+[.#+]+$") ||  // C++, C#
               lower.contains(".") ||             // node.js
               KNOWN_SKILLS.stream().anyMatch(s -> s.toLowerCase().contains(lower) || lower.contains(s.toLowerCase()));
    }

    private String categorizeSkill(String skillName) {
        String lower = skillName.toLowerCase();

        for (Map.Entry<String, Set<String>> entry : SKILL_CATEGORIES.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (lower.equals(keyword) || lower.contains(keyword) || keyword.contains(lower)) {
                    return entry.getKey();
                }
            }
        }

        return "Autres";
    }

    // =====================================================
    // Extraction des langues
    // =====================================================

    private List<CreateLanguageRequest> extractLanguages(String text) {
        List<CreateLanguageRequest> languages = new ArrayList<>();
        Set<String> foundLanguages = new HashSet<>();

        Matcher sectionMatcher = LANGUAGES_SECTION_PATTERN.matcher(text);
        String sectionText;

        if (sectionMatcher.find()) {
            int startIdx = sectionMatcher.end();
            int endIdx = findSectionEnd(text, startIdx);
            sectionText = text.substring(startIdx, endIdx);
        } else {
            // Chercher dans tout le texte
            sectionText = text;
        }

        // Patterns pour détecter les langues avec niveaux
        Pattern langPattern = Pattern.compile(
            "(?i)(français|francais|french|anglais|english|arabe|arabic|" +
            "espagnol|spanish|allemand|german|italien|italian|portugais|portuguese|" +
            "chinois|chinese|mandarin|japonais|japanese|russe|russian|néerlandais|dutch)" +
            "\\s*[:\\-]?\\s*" +
            "(natif|native|bilingue|bilingual|courant|fluent|maîtrise|maitrise|c2|c1|" +
            "professionnel|professional|autonome|independent|intermédiaire|intermediaire|" +
            "intermediate|b2|b1|seuil|threshold|notions|basique|basic|a2|débutant|debutant|beginner|a1)?",
            Pattern.CASE_INSENSITIVE
        );

        Matcher matcher = langPattern.matcher(sectionText);
        while (matcher.find()) {
            String langKey = matcher.group(1).toLowerCase();
            String levelStr = matcher.group(2);

            String langName = LANGUAGE_NAMES.getOrDefault(langKey, capitalizeFirst(langKey));
            if (foundLanguages.contains(langName.toLowerCase())) continue;

            LanguageLevel level = LanguageLevel.B1; // Default
            if (levelStr != null) {
                LanguageLevel mapped = LANGUAGE_LEVELS.get(levelStr.toLowerCase());
                if (mapped != null) {
                    level = mapped;
                }
            }

            foundLanguages.add(langName.toLowerCase());
            languages.add(CreateLanguageRequest.builder()
                    .name(langName)
                    .level(level)
                    .build());
        }

        return languages;
    }

    // =====================================================
    // Helpers
    // =====================================================

    private int findSectionEnd(String text, int startIdx) {
        // Chercher la prochaine section majeure
        Pattern[] sectionPatterns = {
            EXPERIENCE_SECTION_PATTERN,
            EDUCATION_SECTION_PATTERN,
            SKILLS_SECTION_PATTERN,
            LANGUAGES_SECTION_PATTERN,
            Pattern.compile("(?i)(?:^|\\n)(?:\\s*)(?:projet|project|intérêt|interest|certification|référence|reference)\\s*[\\n:]")
        };

        int minEnd = text.length();
        String remaining = text.substring(startIdx);

        for (Pattern p : sectionPatterns) {
            Matcher m = p.matcher(remaining);
            if (m.find()) {
                int pos = startIdx + m.start();
                if (pos < minEnd) {
                    minEnd = pos;
                }
            }
        }

        return minEnd;
    }

    private String capitalizeFirst(String text) {
        if (text == null || text.isEmpty()) return text;
        return text.substring(0, 1).toUpperCase() + text.substring(1).toLowerCase();
    }
}
