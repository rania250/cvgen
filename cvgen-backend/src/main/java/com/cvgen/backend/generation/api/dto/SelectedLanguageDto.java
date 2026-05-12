package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Langue sélectionnée/optimisée par Gemini.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedLanguageDto {

    private String name;
    private String level; // A1, A2, B1, B2, C1, C2, NATIVE
}
