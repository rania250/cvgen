package com.cvgen.backend.generation.api;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.generation.api.dto.GenerateCvRequest;
import com.cvgen.backend.generation.api.dto.SelectedCvContent;
import com.cvgen.backend.generation.application.GenerationService;
import com.cvgen.backend.shared.exception.ResourceNotFoundException;
import com.cvgen.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Endpoints REST de génération de CV optimisé via Gemini AI.
 */
@RestController
@RequestMapping("/api/generation")
@RequiredArgsConstructor
@Tag(name = "Generation", description = "Génération de CV optimisé pour une offre d'emploi")
@SecurityRequirement(name = "BearerAuth")
public class GenerationController {

    private final GenerationService generationService;
    private final UserJpaRepository userRepository;

    @PostMapping("/generate")
    @Operation(summary = "Génère un CV optimisé pour une offre d'emploi")
    public ResponseEntity<ApiResponse<SelectedCvContent>> generateCv(
            Authentication auth,
            @Valid @RequestBody GenerateCvRequest request) {
        UUID userId = currentUserId(auth);
        SelectedCvContent result = generationService.generateCv(userId, request.getJobOfferText());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("CV généré avec succès", result));
    }

    /**
     * Résout l'UUID de l'utilisateur courant à partir de l'email contenu dans
     * le JWT (porté par {@link Authentication#getName()}).
     */
    private UUID currentUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResourceNotFoundException("Utilisateur non authentifié");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur introuvable : " + auth.getName()))
                .getId();
    }
}
