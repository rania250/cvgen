package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Projet sélectionné/optimisé par Gemini pour le CV généré.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedProjectDto {

    private String name;
    private String description;
    private String techStack;
    private String url;
    private String startDate; // ISO YYYY-MM-DD
    private String endDate;   // ISO YYYY-MM-DD ou null
}
