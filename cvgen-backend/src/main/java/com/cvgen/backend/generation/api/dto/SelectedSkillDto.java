package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Compétence sélectionnée/optimisée par Gemini.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectedSkillDto {

    private String name;
    private String level;     // BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    private String category;  // Frontend, Backend, DevOps, etc.
}
