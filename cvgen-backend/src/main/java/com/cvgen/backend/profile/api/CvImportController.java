package com.cvgen.backend.profile.api;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.profile.api.dto.ParsedCvDto;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import com.cvgen.backend.profile.application.CvImportService;
import com.cvgen.backend.profile.application.ImportApplicationService;
import com.cvgen.backend.shared.exception.ResourceNotFoundException;
import com.cvgen.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Endpoints d'import de CV : extraction de texte brut depuis PDF ou DOCX,
 * parsing intelligent en sections, et application au profil utilisateur.
 *
 * <p>Flux d'import en 2 étapes :
 * <ol>
 *   <li>POST /parse : upload + parsing → retourne les données structurées pour prévisualisation</li>
 *   <li>POST /apply : envoi des données sélectionnées → sauvegarde en base</li>
 * </ol>
 */
@RestController
@RequestMapping("/api/profile/import")
@RequiredArgsConstructor
@Tag(name = "CV Import", description = "Import intelligent de CV (PDF / DOCX) avec parsing et prévisualisation")
@SecurityRequirement(name = "BearerAuth")
public class CvImportController {

    private final CvImportService cvImportService;
    private final ImportApplicationService importApplicationService;
    private final UserJpaRepository userRepository;

    @PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Extrait le texte brut d'un CV (PDF ou DOCX)",
            description = "Taille maximale : 10 Mo. Formats acceptés : application/pdf, "
                    + "application/vnd.openxmlformats-officedocument.wordprocessingml.document."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Texte extrait avec succès"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Fichier vide, corrompu ou trop volumineux"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "415", description = "Format non supporté (autre que PDF / DOCX)")
    })
    public ResponseEntity<ApiResponse<String>> extract(@RequestParam("file") MultipartFile file) {
        String extractedText = cvImportService.extractTextFromFile(file);
        return ResponseEntity.ok(ApiResponse.success("Texte extrait avec succès", extractedText));
    }

    @PostMapping(value = "/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Parse un CV et retourne les données structurées pour prévisualisation",
            description = "Extrait le texte du PDF/DOCX, analyse les sections (expériences, formations, "
                    + "compétences, langues) et retourne un objet structuré. Le frontend peut alors "
                    + "afficher une prévisualisation avant confirmation."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "CV parsé avec succès"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Fichier vide, corrompu ou trop volumineux"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "415", description = "Format non supporté (autre que PDF / DOCX)")
    })
    public ResponseEntity<ApiResponse<ParsedCvDto>> parse(@RequestParam("file") MultipartFile file) {
        ParsedCvDto parsed = cvImportService.extractAndParse(file);
        return ResponseEntity.ok(ApiResponse.success("CV analysé avec succès", parsed));
    }

    @PostMapping(value = "/apply", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Applique les données parsées au profil de l'utilisateur courant",
            description = "Sauvegarde les sections sélectionnées (filtrées par le frontend) dans le "
                    + "profil de l'utilisateur authentifié. Met à jour le profil général, ajoute les "
                    + "expériences, formations, compétences et langues."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Profil mis à jour avec succès"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Données invalides")
    })
    public ResponseEntity<ApiResponse<UserProfileDto>> apply(
            Authentication auth,
            @Valid @RequestBody ParsedCvDto dto) {
        UUID userId = currentUserId(auth);
        UserProfileDto updated = importApplicationService.applyParsedCv(userId, dto);
        return ResponseEntity.ok(ApiResponse.success("Profil importé avec succès", updated));
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
