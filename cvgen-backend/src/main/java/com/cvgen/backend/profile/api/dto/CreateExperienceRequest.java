package com.cvgen.backend.profile.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Payload de création d'une expérience professionnelle.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateExperienceRequest {

    @NotBlank(message = "Le titre du poste est requis")
    @Size(max = 255)
    private String jobTitle;

    @NotBlank(message = "L'entreprise est requise")
    @Size(max = 255)
    private String company;

    @Size(max = 255)
    private String location;

    @NotNull(message = "La date de début est requise")
    private LocalDate startDate;

    /** {@code null} si poste actuel. */
    private LocalDate endDate;

    private boolean current;

    @Size(max = 5000)
    private String description;

    private Integer displayOrder;
}
