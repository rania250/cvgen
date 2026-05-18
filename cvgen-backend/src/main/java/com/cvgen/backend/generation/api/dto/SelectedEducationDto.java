package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Formation sélectionnée/optimisée par Gemini.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedEducationDto {

    private String degree;
    private String school;
    private String fieldOfStudy;
    private String startDate; // ISO YYYY-MM-DD
    private String endDate;   // ISO YYYY-MM-DD
}
