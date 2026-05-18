package com.cvgen.backend.profile.api.dto;

import com.cvgen.backend.profile.infrastructure.persistence.entity.SkillLevel;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de lecture d'une compétence technique.
 */
@Builder
public record SkillDto(
        UUID id,
        String name,
        SkillLevel level,
        String category,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
