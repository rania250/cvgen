package com.cvgen.backend.profile.api.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

/**
 * Payload pour réordonner une collection d'entités du profil
 * (expériences, formations, compétences…).
 *
 * @param ids liste ordonnée des identifiants ; l'index dans la liste devient
 *            le nouveau {@code displayOrder} (0-based).
 */
public record ReorderRequest(
        @NotEmpty(message = "La liste d'identifiants est requise")
        List<UUID> ids
) {
}
