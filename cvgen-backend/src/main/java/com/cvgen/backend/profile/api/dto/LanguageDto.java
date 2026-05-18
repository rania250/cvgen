package com.cvgen.backend.profile.api.dto;

import com.cvgen.backend.profile.infrastructure.persistence.entity.LanguageLevel;
import lombok.Builder;

import java.util.UUID;

/**
 * DTO de lecture d'une langue parlée.
 */
@Builder
public record LanguageDto(
        UUID id,
        String name,
        LanguageLevel level,
        Integer displayOrder
) {
}
