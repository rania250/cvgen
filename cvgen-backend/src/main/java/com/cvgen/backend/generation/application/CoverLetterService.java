package com.cvgen.backend.generation.application;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.auth.infrastructure.persistence.entity.UserEntity;
import com.cvgen.backend.generation.api.dto.CoverLetterDto;
import com.cvgen.backend.generation.infrastructure.gemini.GeminiClient;
import com.cvgen.backend.profile.api.dto.ExperienceDto;
import com.cvgen.backend.profile.api.dto.SkillDto;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import com.cvgen.backend.profile.application.ProfileService;
import com.cvgen.backend.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service de génération de lettre de motivation adaptée à une offre d'emploi.
 *
 * <p>Réutilise {@link GeminiClient} (déjà utilisé pour la génération de CV).
 * Le client Gemini force {@code responseMimeType=application/json} : on
 * demande donc à l'IA un objet JSON {@code {"coverLetter": "..."}} que l'on
 * parse ensuite, plutôt qu'un texte brut.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoverLetterService {

    private final ProfileService profileService;
    private final UserJpaRepository userRepository;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Génère une lettre de motivation pour l'utilisateur donné et l'offre fournie.
     *
     * @param userId       ID utilisateur (depuis JWT)
     * @param jobOfferText Texte de l'offre
     * @param company      Nom de l'entreprise (peut être null)
     * @param jobTitle     Intitulé du poste (peut être null)
     * @param tone         "formel" | "chaleureux" | "créatif" (défaut formel)
     */
    public CoverLetterDto generate(UUID userId, String jobOfferText,
                                   String company, String jobTitle, String tone) {
        UserProfileDto profile = profileService.getUserProfile(userId);
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userId));

        String prompt = buildPrompt(profile, user, jobOfferText, company, jobTitle, tone);
        String raw = geminiClient.generateContent(prompt, 0.7, 4096);

        String letter = parseLetter(raw);
        return CoverLetterDto.builder()
                .content(letter)
                .charCount(letter.length())
                .build();
    }

    private String buildPrompt(UserProfileDto profile, UserEntity user, String jobOfferText,
                               String company, String jobTitle, String tone) {
        String safeTone = (tone == null || tone.isBlank()) ? "formel" : tone.trim();
        String fullName = (safe(user.getFirstName()) + " " + safe(user.getLastName())).trim();

        StringBuilder p = new StringBuilder();
        p.append("Tu es un expert en rédaction de lettres de motivation en français.\n");
        p.append("Rédige une lettre de motivation PERCUTANTE et personnalisée pour la candidature ci-dessous.\n\n");

        p.append("=== CANDIDAT ===\n");
        p.append("Nom: ").append(fullName.isBlank() ? "Le candidat" : fullName).append("\n");
        if (user.getEmail() != null) p.append("Email: ").append(user.getEmail()).append("\n");
        if (profile.phone() != null) p.append("Téléphone: ").append(profile.phone()).append("\n");
        if (profile.location() != null) p.append("Localisation: ").append(profile.location()).append("\n");
        if (profile.title() != null) p.append("Titre actuel: ").append(profile.title()).append("\n");
        if (profile.summary() != null) p.append("Résumé: ").append(profile.summary()).append("\n");

        if (profile.experiences() != null && !profile.experiences().isEmpty()) {
            p.append("\n--- EXPÉRIENCES CLÉS ---\n");
            int count = 0;
            for (ExperienceDto exp : profile.experiences()) {
                if (count++ >= 4) break;
                p.append("- ").append(safe(exp.jobTitle())).append(" @ ").append(safe(exp.company()));
                if (exp.description() != null && !exp.description().isBlank()) {
                    p.append(" : ").append(truncate(exp.description(), 200));
                }
                p.append("\n");
            }
        }

        if (profile.skills() != null && !profile.skills().isEmpty()) {
            p.append("\n--- COMPÉTENCES ---\n");
            int count = 0;
            for (SkillDto skill : profile.skills()) {
                if (count++ >= 12) break;
                p.append("- ").append(safe(skill.name())).append("\n");
            }
        }

        p.append("\n=== OFFRE D'EMPLOI ===\n");
        if (company != null && !company.isBlank()) p.append("Entreprise: ").append(company).append("\n");
        if (jobTitle != null && !jobTitle.isBlank()) p.append("Poste: ").append(jobTitle).append("\n");
        p.append(truncate(jobOfferText, 8000)).append("\n");

        p.append("\n=== CONSIGNES ===\n");
        p.append("- Longueur : 250 à 350 mots.\n");
        p.append("- Ton : ").append(safeTone).append(".\n");
        p.append("- Langue : français.\n");
        p.append("- Structure : accroche personnalisée → 2 paragraphes reliant le profil aux besoins de l'offre");
        p.append(" (avec des exemples concrets tirés du profil) → conclusion appelant à un entretien.\n");
        p.append("- Mentionne 3 à 5 mots-clés/compétences présents dans l'offre.\n");
        p.append("- N'INVENTE JAMAIS d'expérience, de diplôme ou de compétence absents du profil.\n");
        p.append("- N'utilise PAS de formule passe-partout vide (\"je me permets de vous écrire\").\n");
        p.append("- Termine par \"Cordialement,\" suivi du nom du candidat.\n");
        p.append("- Ne mets PAS de bloc d'en-tête d'adresse ni de date (le formulaire s'en charge).\n\n");

        p.append("Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, de la forme :\n");
        p.append("{ \"coverLetter\": \"texte complet de la lettre avec des sauts de ligne \\n\" }");

        return p.toString();
    }

    private String parseLetter(String raw) {
        String json = raw == null ? "" : raw.trim();
        if (json.startsWith("```json")) json = json.substring(7);
        if (json.startsWith("```")) json = json.substring(3);
        if (json.endsWith("```")) json = json.substring(0, json.length() - 3);
        json = json.trim();

        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode letterNode = node.get("coverLetter");
            if (letterNode != null && !letterNode.isNull()) {
                return letterNode.asText().trim();
            }
            // Repli : certains modèles renvoient { "letter": ... } ou du texte brut
            JsonNode alt = node.get("letter");
            if (alt != null && !alt.isNull()) return alt.asText().trim();
        } catch (Exception e) {
            log.warn("Réponse Gemini lettre non-JSON, utilisation du texte brut. Cause: {}", e.getMessage());
        }
        // Dernier repli : retourner le texte nettoyé
        return json;
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
