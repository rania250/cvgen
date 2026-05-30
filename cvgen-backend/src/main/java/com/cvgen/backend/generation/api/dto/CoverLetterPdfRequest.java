package com.cvgen.backend.generation.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Requête de conversion d'une lettre de motivation (texte) en PDF.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CoverLetterPdfRequest {

    @NotBlank(message = "Le contenu de la lettre est obligatoire")
    @Size(max = 20000, message = "Le contenu ne doit pas dépasser 20000 caractères")
    private String content;
}
