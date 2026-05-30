package com.cvgen.backend.generation.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lettre de motivation générée par l'IA.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoverLetterDto {

    /** Texte complet de la lettre, prêt à coller dans un formulaire. */
    private String content;

    /** Nombre de caractères (utile côté UI pour les limites de champ). */
    private int charCount;
}
