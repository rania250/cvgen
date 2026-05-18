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
 * Payload de création d'un projet personnel/technique.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProjectRequest {

    @NotBlank(message = "Le nom du projet est requis")
    @Size(max = 255)
    private String name;

    @Size(max = 5000)
    private String description;

    @Size(max = 500)
    private String techStack;

    @URL(message = "URL invalide")
    @Size(max = 500)
    private String url;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    private Integer displayOrder;
}
