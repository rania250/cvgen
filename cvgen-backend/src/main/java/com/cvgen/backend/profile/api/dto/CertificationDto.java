package com.cvgen.backend.profile.api.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de lecture d'une certification professionnelle.
 */
@Builder
public record CertificationDto(
        UUID id,
        String name,
        String issuer,
        LocalDate issueDate,
        LocalDate expiryDate,
        String credentialUrl,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
