package com.cvgen.backend.generation.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Requête d'export PDF d'un CV généré.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExportPdfRequest {

    @NotBlank(message = "L'ID du template est obligatoire")
    private String templateId;
}
