package com.cvgen.backend.profile.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Payload de création d'une certification professionnelle.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCertificationRequest {

    @NotBlank(message = "Le nom de la certification est requis")
    @Size(max = 255)
    private String name;

    @Size(max = 255)
    private String issuer;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate issueDate;

    /** {@code null} si certification sans expiration. */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate expiryDate;

    @URL(message = "URL d'identifiant invalide")
    @Size(max = 500)
    private String credentialUrl;

    private Integer displayOrder;
}
