package com.cvgen.backend.profile.api.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

/**
 * Payload de mise à jour partielle du profil utilisateur.
 * Tous les champs sont optionnels (PATCH-like) ; lorsqu'ils sont fournis,
 * ils doivent respecter les contraintes ci-dessous.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    /** Titre professionnel. Non vide si renseigné. */
    @Size(min = 1, max = 255, message = "Le titre doit contenir entre 1 et 255 caractères")
    private String title;

    @Size(max = 5000, message = "Le résumé est trop long (5000 caractères max)")
    private String summary;

    @Size(max = 50, message = "Numéro de téléphone trop long")
    private String phone;

    @Size(max = 255)
    private String location;

    @URL(message = "URL de photo invalide")
    @Size(max = 500)
    private String photoUrl;

    @URL(message = "URL LinkedIn invalide")
    @Size(max = 500)
    private String linkedinUrl;

    @URL(message = "URL GitHub invalide")
    @Size(max = 500)
    private String githubUrl;

    @URL(message = "URL de portfolio invalide")
    @Size(max = 500)
    private String portfolioUrl;
}
