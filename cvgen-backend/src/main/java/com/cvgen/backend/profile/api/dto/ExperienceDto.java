package com.cvgen.backend.profile.api.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de lecture d'une expérience professionnelle.
 */
@Builder
public record ExperienceDto(
        UUID id,
        String jobTitle,
        String company,
        String location,
        LocalDate startDate,
        LocalDate endDate,
        boolean current,
        String description,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
