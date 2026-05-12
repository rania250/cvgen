package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Certification sélectionnée/optimisée par Gemini.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedCertificationDto {

    private String name;
    private String issuer;
    private String issueDate; // ISO YYYY-MM-DD
}
