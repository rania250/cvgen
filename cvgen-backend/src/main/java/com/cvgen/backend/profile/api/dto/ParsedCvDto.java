package com.cvgen.backend.profile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO contenant le CV parsé avec toutes les sections structurées.
 * Utilisé pour le flux d'import en 2 étapes : parse (prévisualisation) → apply (sauvegarde).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedCvDto {

    /** Informations générales extraites (titre, résumé, contact, liens). */
    private UpdateProfileRequest profileInfo;

    /** Expériences professionnelles détectées. */
    private List<CreateExperienceRequest> experiences;

    /** Formations détectées. */
    private List<CreateEducationRequest> educations;

    /** Compétences techniques détectées et catégorisées. */
    private List<CreateSkillRequest> skills;

    /** Langues parlées détectées avec leur niveau. */
    private List<CreateLanguageRequest> languages;
}
