package com.cvgen.backend.profile.api.dto;

import com.cvgen.backend.profile.infrastructure.persistence.entity.SkillLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload de création d'une compétence technique.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSkillRequest {

    @NotBlank(message = "Le nom de la compétence est requis")
    @Size(max = 100)
    private String name;

    @NotNull(message = "Le niveau est requis")
    private SkillLevel level;

    @Size(max = 100)
    private String category;

    private Integer displayOrder;
}
