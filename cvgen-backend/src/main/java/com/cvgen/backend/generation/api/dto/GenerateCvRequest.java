package com.cvgen.backend.generation.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Requête de génération de CV optimisé pour une offre d'emploi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateCvRequest {

    @NotBlank(message = "Le texte de l'offre est obligatoire")
    @Size(max = 10000, message = "Le texte de l'offre ne doit pas dépasser 10000 caractères")
    private String jobOfferText;
}
