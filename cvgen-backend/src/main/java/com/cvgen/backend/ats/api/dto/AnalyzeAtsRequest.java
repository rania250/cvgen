package com.cvgen.backend.ats.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalyzeAtsRequest {

    @NotBlank(message = "Le texte du CV est requis")
    private String cvText;

    @NotBlank(message = "Le texte de l'offre est requis")
    private String offerText;
}
