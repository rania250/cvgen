package com.cvgen.backend.profile.api.dto;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Réponse complète du profil utilisateur : identité + collections rattachées.
 */
@Builder
public record UserProfileDto(
        UUID id,
        UUID userId,
        String title,
        String summary,
        String phone,
        String location,
        String photoUrl,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<ExperienceDto> experiences,
        List<EducationDto> educations,
        List<SkillDto> skills,
        List<LanguageDto> languages,
        List<CertificationDto> certifications,
        List<ProjectDto> projects
) {
}
