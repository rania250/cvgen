package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Contenu d'un CV optimisé généré par Gemini.
 * Contient le profil + les éléments sélectionnés pour une page.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedCvContent {

    private UUID generatedCvId;    // ID de l'enregistrement en base
    private String title;          // Titre réécrit
    private String summary;        // Bio optimisée

    // Éléments sélectionnés par Gemini (max 4 exp, 12 skills, 2 projets, toutes les formations)
    private List<SelectedExperienceDto> experiences;
    private List<SelectedEducationDto> educations;
    private List<SelectedProjectDto> projects;
    private List<SelectedSkillDto> skills;
    private List<SelectedLanguageDto> languages;
    private List<SelectedCertificationDto> certifications;

    private String createdAt;      // ISO timestamp
}
