package com.cvgen.backend.profile.api.dto;

import com.cvgen.backend.profile.infrastructure.persistence.entity.LanguageLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload de création d'une langue parlée.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLanguageRequest {

    @NotBlank(message = "Le nom de la langue est requis")
    @Size(max = 100)
    private String name;

    @NotNull(message = "Le niveau est requis")
    private LanguageLevel level;

    private Integer displayOrder;
}
