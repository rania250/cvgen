package com.cvgen.backend.profile.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Payload de création d'une formation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEducationRequest {

    @Size(max = 255)
    private String degree;

    @NotBlank(message = "L'établissement est requis")
    @Size(max = 255)
    private String school;

    @Size(max = 255)
    private String fieldOfStudy;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    @Size(max = 5000)
    private String description;

    private Integer displayOrder;
}
