package com.cvgen.backend.profile.application;

import com.cvgen.backend.profile.api.dto.CreateEducationRequest;
import com.cvgen.backend.profile.api.dto.CreateExperienceRequest;
import com.cvgen.backend.profile.api.dto.CreateLanguageRequest;
import com.cvgen.backend.profile.api.dto.CreateSkillRequest;
import com.cvgen.backend.profile.api.dto.ParsedCvDto;
import com.cvgen.backend.profile.api.dto.UpdateProfileRequest;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service d'application des données parsées d'un CV au profil utilisateur.
 * Orchestration des appels à ProfileService pour sauvegarder les sections sélectionnées.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportApplicationService {

    private final ProfileService profileService;

    /**
     * Applique les données parsées du CV au profil de l'utilisateur courant.
     * Met à jour le profil général et ajoute les expériences, formations, compétences et langues.
     *
     * @param userId l'identifiant de l'utilisateur authentifié
     * @param dto les données parsées (filtrées par le frontend selon la sélection utilisateur)
     * @return le profil utilisateur mis à jour
     */
    public UserProfileDto applyParsedCv(UUID userId, ParsedCvDto dto) {
        log.info("Application du CV parsé pour l'utilisateur {}", userId);

        // 1. Mettre à jour les informations générales du profil
        if (dto.getProfileInfo() != null) {
            applyProfileInfo(userId, dto.getProfileInfo());
        }

        // 2. Ajouter les expériences
        if (dto.getExperiences() != null && !dto.getExperiences().isEmpty()) {
            applyExperiences(userId, dto.getExperiences());
        }

        // 3. Ajouter les formations
        if (dto.getEducations() != null && !dto.getEducations().isEmpty()) {
            applyEducations(userId, dto.getEducations());
        }

        // 4. Ajouter les compétences
        if (dto.getSkills() != null && !dto.getSkills().isEmpty()) {
            applySkills(userId, dto.getSkills());
        }

        // 5. Ajouter les langues
        if (dto.getLanguages() != null && !dto.getLanguages().isEmpty()) {
            applyLanguages(userId, dto.getLanguages());
        }

        log.info("CV importé avec succès pour l'utilisateur {} : {} expériences, {} formations, " +
                "{} compétences, {} langues",
                userId,
                dto.getExperiences() != null ? dto.getExperiences().size() : 0,
                dto.getEducations() != null ? dto.getEducations().size() : 0,
                dto.getSkills() != null ? dto.getSkills().size() : 0,
                dto.getLanguages() != null ? dto.getLanguages().size() : 0);

        // Retourner le profil complet mis à jour
        return profileService.getUserProfile(userId);
    }

    private void applyProfileInfo(UUID userId, UpdateProfileRequest profileInfo) {
        // Ne mettre à jour que les champs non null et non vides
        UpdateProfileRequest.UpdateProfileRequestBuilder updateBuilder = UpdateProfileRequest.builder();
        boolean hasUpdate = false;

        if (profileInfo.getTitle() != null && !profileInfo.getTitle().isBlank()) {
            updateBuilder.title(truncate(profileInfo.getTitle(), 150));
            hasUpdate = true;
        }
        if (profileInfo.getSummary() != null && !profileInfo.getSummary().isBlank()) {
            updateBuilder.summary(truncate(profileInfo.getSummary(), 5000));
            hasUpdate = true;
        }
        if (profileInfo.getPhone() != null && !profileInfo.getPhone().isBlank()) {
            updateBuilder.phone(truncate(profileInfo.getPhone(), 32));
            hasUpdate = true;
        }
        if (profileInfo.getLocation() != null && !profileInfo.getLocation().isBlank()) {
            updateBuilder.location(truncate(profileInfo.getLocation(), 150));
            hasUpdate = true;
        }
        if (profileInfo.getLinkedinUrl() != null && !profileInfo.getLinkedinUrl().isBlank()) {
            updateBuilder.linkedinUrl(profileInfo.getLinkedinUrl());
            hasUpdate = true;
        }
        if (profileInfo.getGithubUrl() != null && !profileInfo.getGithubUrl().isBlank()) {
            updateBuilder.githubUrl(profileInfo.getGithubUrl());
            hasUpdate = true;
        }
        if (profileInfo.getPortfolioUrl() != null && !profileInfo.getPortfolioUrl().isBlank()) {
            updateBuilder.portfolioUrl(profileInfo.getPortfolioUrl());
            hasUpdate = true;
        }

        if (hasUpdate) {
            try {
                profileService.updateProfile(userId, updateBuilder.build());
                log.debug("Profil général mis à jour pour l'utilisateur {}", userId);
            } catch (Exception ex) {
                log.error("Échec de la mise à jour du profil général : {}", ex.getMessage());
            }
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    private void applyExperiences(UUID userId, List<CreateExperienceRequest> experiences) {
        int order = 0;
        for (CreateExperienceRequest exp : experiences) {
            // S'assurer que les champs obligatoires sont présents
            if (exp.getJobTitle() == null || exp.getJobTitle().isBlank()) {
                log.warn("Expérience ignorée : titre du poste manquant");
                continue;
            }
            if (exp.getCompany() == null || exp.getCompany().isBlank()) {
                exp.setCompany("Entreprise non précisée");
            }
            // startDate est NOT NULL en base : on met une date par défaut si manquante
            if (exp.getStartDate() == null) {
                log.warn("Expérience '{}' sans date de début : valeur par défaut appliquée (aujourd'hui)", exp.getJobTitle());
                exp.setStartDate(LocalDate.now());
            }

            // Définir l'ordre d'affichage
            exp.setDisplayOrder(order);

            try {
                profileService.addExperience(userId, exp);
                order++;
            } catch (Exception ex) {
                log.error("Échec de l'ajout de l'expérience '{}' : {}", exp.getJobTitle(), ex.getMessage());
            }
        }
        log.debug("{} expériences ajoutées pour l'utilisateur {}", order, userId);
    }

    private void applyEducations(UUID userId, List<CreateEducationRequest> educations) {
        int order = 0;
        for (CreateEducationRequest edu : educations) {
            // S'assurer que l'établissement est présent
            if (edu.getSchool() == null || edu.getSchool().isBlank()) {
                log.warn("Formation ignorée : établissement manquant");
                continue;
            }

            // Définir l'ordre d'affichage
            edu.setDisplayOrder(order);

            try {
                profileService.addEducation(userId, edu);
                order++;
            } catch (Exception ex) {
                log.error("Échec de l'ajout de la formation '{}' : {}", edu.getSchool(), ex.getMessage());
            }
        }
        log.debug("{} formations ajoutées pour l'utilisateur {}", order, userId);
    }

    private void applySkills(UUID userId, List<CreateSkillRequest> skills) {
        int order = 0;
        for (CreateSkillRequest skill : skills) {
            // S'assurer que le nom est présent
            if (skill.getName() == null || skill.getName().isBlank()) {
                log.warn("Compétence ignorée : nom manquant");
                continue;
            }

            // Définir l'ordre d'affichage
            skill.setDisplayOrder(order);

            try {
                profileService.addSkill(userId, skill);
                order++;
            } catch (Exception ex) {
                log.error("Échec de l'ajout de la compétence '{}' : {}", skill.getName(), ex.getMessage());
            }
        }
        log.debug("{} compétences ajoutées pour l'utilisateur {}", order, userId);
    }

    private void applyLanguages(UUID userId, List<CreateLanguageRequest> languages) {
        int order = 0;
        for (CreateLanguageRequest lang : languages) {
            // S'assurer que le nom est présent
            if (lang.getName() == null || lang.getName().isBlank()) {
                log.warn("Langue ignorée : nom manquant");
                continue;
            }

            // Définir l'ordre d'affichage
            lang.setDisplayOrder(order);

            try {
                profileService.addLanguage(userId, lang);
                order++;
            } catch (Exception ex) {
                log.error("Échec de l'ajout de la langue '{}' : {}", lang.getName(), ex.getMessage());
            }
        }
        log.debug("{} langues ajoutées pour l'utilisateur {}", order, userId);
    }
}
