package com.cvgen.backend.generation.api;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.generation.api.dto.CoverLetterDto;
import com.cvgen.backend.generation.api.dto.CoverLetterPdfRequest;
import com.cvgen.backend.generation.api.dto.ExportPdfRequest;
import com.cvgen.backend.generation.api.dto.GenerateCoverLetterRequest;
import com.cvgen.backend.generation.api.dto.GenerateCvRequest;
import com.cvgen.backend.generation.api.dto.SelectedCvContent;
import com.cvgen.backend.generation.application.CoverLetterPdfService;
import com.cvgen.backend.generation.application.CoverLetterService;
import com.cvgen.backend.generation.application.GenerationService;
import com.cvgen.backend.generation.application.LatexTemplateService;
import com.cvgen.backend.generation.application.TectonicPdfCompiler;
import com.cvgen.backend.shared.exception.ResourceNotFoundException;
import com.cvgen.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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
    private final LatexTemplateService latexTemplateService;
    private final TectonicPdfCompiler pdfCompiler;
    private final CoverLetterService coverLetterService;
    private final CoverLetterPdfService coverLetterPdfService;
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

    @PostMapping("/{id}/export-pdf")
    @Operation(summary = "Exporte un CV généré au format PDF")
    public ResponseEntity<byte[]> exportPdf(
            Authentication auth,
            @PathVariable("id") UUID generatedCvId,
            @Valid @RequestBody ExportPdfRequest request) {
        UUID userId = currentUserId(auth);

        // Générer le LaTeX
        String latexContent = latexTemplateService.generateLatex(userId, generatedCvId, request.getTemplateId());

        // Compiler en PDF
        String baseFileName = "CV_" + userId.toString().substring(0, 8);
        byte[] pdfBytes = pdfCompiler.compile(latexContent, baseFileName);

        // Construire le nom de fichier
        String fileName = String.format("CV_%s_%s.pdf",
                userId.toString().substring(0, 8),
                LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")));

        // Retourner le PDF avec les headers appropriés
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", fileName);
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @PostMapping("/cover-letter")
    @Operation(summary = "Génère une lettre de motivation adaptée à une offre d'emploi")
    public ResponseEntity<ApiResponse<CoverLetterDto>> generateCoverLetter(
            Authentication auth,
            @Valid @RequestBody GenerateCoverLetterRequest request) {
        UUID userId = currentUserId(auth);
        CoverLetterDto result = coverLetterService.generate(
                userId,
                request.getJobOfferText(),
                request.getCompany(),
                request.getJobTitle(),
                request.getTone());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Lettre de motivation générée", result));
    }

    @PostMapping("/cover-letter/pdf")
    @Operation(summary = "Convertit une lettre de motivation (texte) en PDF")
    public ResponseEntity<byte[]> coverLetterPdf(
            Authentication auth,
            @Valid @RequestBody CoverLetterPdfRequest request) {
        UUID userId = currentUserId(auth);
        byte[] pdfBytes = coverLetterPdfService.generatePdf(userId, request.getContent());

        String fileName = String.format("Lettre_Motivation_%s_%s.pdf",
                userId.toString().substring(0, 8),
                LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", fileName);
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
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
