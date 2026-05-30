package com.cvgen.backend.generation.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Requête de génération d'une lettre de motivation adaptée à une offre.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateCoverLetterRequest {

    @NotBlank(message = "Le texte de l'offre est obligatoire")
    @Size(max = 10000, message = "Le texte de l'offre ne doit pas dépasser 10000 caractères")
    private String jobOfferText;

    /** Nom de l'entreprise (optionnel, améliore l'accroche). */
    @Size(max = 200)
    private String company;

    /** Intitulé du poste (optionnel, améliore l'accroche). */
    @Size(max = 200)
    private String jobTitle;

    /** Ton souhaité : "formel", "chaleureux" ou "créatif". Défaut : formel. */
    @Size(max = 30)
    private String tone;
}
