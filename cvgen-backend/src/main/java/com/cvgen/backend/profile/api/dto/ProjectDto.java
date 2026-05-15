package com.cvgen.backend.profile.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de réponse pour un projet.
 */
public record ProjectDto(
        UUID id,
        String name,
        String description,
        String techStack,
        String url,
        LocalDate startDate,
        LocalDate endDate,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
