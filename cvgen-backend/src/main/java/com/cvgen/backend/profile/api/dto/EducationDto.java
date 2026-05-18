package com.cvgen.backend.profile.api.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de lecture d'une formation.
 */
@Builder
public record EducationDto(
        UUID id,
        String degree,
        String school,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate,
        String description,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
