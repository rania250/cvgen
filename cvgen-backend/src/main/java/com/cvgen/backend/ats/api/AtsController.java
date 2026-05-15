package com.cvgen.backend.ats.api;

import com.cvgen.backend.ats.api.dto.AnalyzeAtsRequest;
import com.cvgen.backend.ats.api.dto.AtsScoreDto;
import com.cvgen.backend.ats.application.AtsScoreService;
import com.cvgen.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ats")
@RequiredArgsConstructor
@Tag(name = "ATS", description = "Analyse de correspondance CV / offre d'emploi")
@SecurityRequirement(name = "BearerAuth")
public class AtsController {

    private final AtsScoreService atsScoreService;

    @PostMapping("/analyze")
    @Operation(summary = "Analyse le score ATS d'un CV par rapport à une offre")
    public ResponseEntity<ApiResponse<AtsScoreDto>> analyze(@Valid @RequestBody AnalyzeAtsRequest request) {
        AtsScoreDto result = atsScoreService.analyzeAts(request.getCvText(), request.getOfferText());
        return ResponseEntity.ok(ApiResponse.success("Analyse ATS terminée", result));
    }
}
