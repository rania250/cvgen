package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Expérience professionnelle sélectionnée/optimisée par Gemini.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedExperienceDto {

    private String jobTitle;
    private String company;
    private String location;
    private String startDate; // ISO YYYY-MM-DD
    private String endDate;   // ISO YYYY-MM-DD ou null si current
    private boolean current;
    private String description; // Version optimisée pour l'offre
}
