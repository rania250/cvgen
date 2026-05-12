package com.cvgen.backend.profile.api;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.profile.api.dto.CertificationDto;
import com.cvgen.backend.profile.api.dto.CreateCertificationRequest;
import com.cvgen.backend.profile.api.dto.CreateEducationRequest;
import com.cvgen.backend.profile.api.dto.CreateExperienceRequest;
import com.cvgen.backend.profile.api.dto.CreateLanguageRequest;
import com.cvgen.backend.profile.api.dto.CreateSkillRequest;
import com.cvgen.backend.profile.api.dto.EducationDto;
import com.cvgen.backend.profile.api.dto.ExperienceDto;
import com.cvgen.backend.profile.api.dto.LanguageDto;
import com.cvgen.backend.profile.api.dto.ReorderRequest;
import com.cvgen.backend.profile.api.dto.SkillDto;
import com.cvgen.backend.profile.api.dto.UpdateProfileRequest;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import com.cvgen.backend.profile.application.ProfileService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Endpoints REST du profil utilisateur (CV) : informations personnelles +
 * expériences, formations, compétences, langues, certifications.
 *
 * <p>Tous les endpoints exigent un Bearer token JWT ; l'identifiant de
 * l'utilisateur courant est extrait du {@link SecurityContextHolder} via
 * {@link Authentication#getName()} (email).</p>
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "Gestion du CV de l'utilisateur connecté")
@SecurityRequirement(name = "BearerAuth")
public class ProfileController {

    private final ProfileService profileService;
    private final UserJpaRepository userRepository;

    // =====================================================
    // Profil principal
    // =====================================================

    @GetMapping
    @Operation(summary = "Récupère le profil complet (CV) de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(Authentication auth) {
        UserProfileDto dto = profileService.getUserProfile(currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PutMapping
    @Operation(summary = "Met à jour les informations personnelles du profil")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfile(
            Authentication auth,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserProfileDto dto = profileService.updateProfile(currentUserId(auth), request);
        return ResponseEntity.ok(ApiResponse.success("Profil mis à jour", dto));
    }

    // =====================================================
    // Experiences
    // =====================================================

    @PostMapping("/experiences")
    @Operation(summary = "Ajoute une expérience professionnelle")
    public ResponseEntity<ApiResponse<ExperienceDto>> addExperience(
            Authentication auth,
            @Valid @RequestBody CreateExperienceRequest request) {
        ExperienceDto dto = profileService.addExperience(currentUserId(auth), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Expérience ajoutée", dto));
    }

    @PutMapping("/experiences/{id}")
    @Operation(summary = "Met à jour une expérience professionnelle")
    public ResponseEntity<ApiResponse<ExperienceDto>> updateExperience(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody CreateExperienceRequest request) {
        ExperienceDto dto = profileService.updateExperience(currentUserId(auth), id, request);
        return ResponseEntity.ok(ApiResponse.success("Expérience mise à jour", dto));
    }

    @DeleteMapping("/experiences/{id}")
    @Operation(summary = "Supprime une expérience professionnelle")
    public ResponseEntity<ApiResponse<Void>> deleteExperience(
            Authentication auth,
            @PathVariable UUID id) {
        profileService.deleteExperience(currentUserId(auth), id);
        return ResponseEntity.ok(ApiResponse.success("Expérience supprimée", null));
    }

    @PutMapping("/experiences/reorder")
    @Operation(summary = "Réordonne les expériences professionnelles")
    public ResponseEntity<ApiResponse<Void>> reorderExperiences(
            Authentication auth,
            @Valid @RequestBody ReorderRequest request) {
        profileService.reorderExperiences(currentUserId(auth), request.ids());
        return ResponseEntity.ok(ApiResponse.success("Ordre des expériences mis à jour", null));
    }

    // =====================================================
    // Educations
    // =====================================================

    @PostMapping("/educations")
    @Operation(summary = "Ajoute une formation")
    public ResponseEntity<ApiResponse<EducationDto>> addEducation(
            Authentication auth,
            @Valid @RequestBody CreateEducationRequest request) {
        EducationDto dto = profileService.addEducation(currentUserId(auth), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Formation ajoutée", dto));
    }

    @PutMapping("/educations/{id}")
    @Operation(summary = "Met à jour une formation")
    public ResponseEntity<ApiResponse<EducationDto>> updateEducation(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody CreateEducationRequest request) {
        EducationDto dto = profileService.updateEducation(currentUserId(auth), id, request);
        return ResponseEntity.ok(ApiResponse.success("Formation mise à jour", dto));
    }

    @DeleteMapping("/educations/{id}")
    @Operation(summary = "Supprime une formation")
    public ResponseEntity<ApiResponse<Void>> deleteEducation(
            Authentication auth,
            @PathVariable UUID id) {
        profileService.deleteEducation(currentUserId(auth), id);
        return ResponseEntity.ok(ApiResponse.success("Formation supprimée", null));
    }

    @PutMapping("/educations/reorder")
    @Operation(summary = "Réordonne les formations")
    public ResponseEntity<ApiResponse<Void>> reorderEducations(
            Authentication auth,
            @Valid @RequestBody ReorderRequest request) {
        profileService.reorderEducations(currentUserId(auth), request.ids());
        return ResponseEntity.ok(ApiResponse.success("Ordre des formations mis à jour", null));
    }

    // =====================================================
    // Skills
    // =====================================================

    @PostMapping("/skills")
    @Operation(summary = "Ajoute une compétence technique")
    public ResponseEntity<ApiResponse<SkillDto>> addSkill(
            Authentication auth,
            @Valid @RequestBody CreateSkillRequest request) {
        SkillDto dto = profileService.addSkill(currentUserId(auth), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Compétence ajoutée", dto));
    }

    @PutMapping("/skills/{id}")
    @Operation(summary = "Met à jour une compétence technique")
    public ResponseEntity<ApiResponse<SkillDto>> updateSkill(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody CreateSkillRequest request) {
        SkillDto dto = profileService.updateSkill(currentUserId(auth), id, request);
        return ResponseEntity.ok(ApiResponse.success("Compétence mise à jour", dto));
    }

    @DeleteMapping("/skills/{id}")
    @Operation(summary = "Supprime une compétence technique")
    public ResponseEntity<ApiResponse<Void>> deleteSkill(
            Authentication auth,
            @PathVariable UUID id) {
        profileService.deleteSkill(currentUserId(auth), id);
        return ResponseEntity.ok(ApiResponse.success("Compétence supprimée", null));
    }

    @PutMapping("/skills/reorder")
    @Operation(summary = "Réordonne les compétences")
    public ResponseEntity<ApiResponse<Void>> reorderSkills(
            Authentication auth,
            @Valid @RequestBody ReorderRequest request) {
        profileService.reorderSkills(currentUserId(auth), request.ids());
        return ResponseEntity.ok(ApiResponse.success("Ordre des compétences mis à jour", null));
    }

    // =====================================================
    // Languages
    // =====================================================

    @PostMapping("/languages")
    @Operation(summary = "Ajoute une langue parlée")
    public ResponseEntity<ApiResponse<LanguageDto>> addLanguage(
            Authentication auth,
            @Valid @RequestBody CreateLanguageRequest request) {
        LanguageDto dto = profileService.addLanguage(currentUserId(auth), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Langue ajoutée", dto));
    }

    @PutMapping("/languages/{id}")
    @Operation(summary = "Met à jour une langue parlée")
    public ResponseEntity<ApiResponse<LanguageDto>> updateLanguage(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody CreateLanguageRequest request) {
        LanguageDto dto = profileService.updateLanguage(currentUserId(auth), id, request);
        return ResponseEntity.ok(ApiResponse.success("Langue mise à jour", dto));
    }

    @DeleteMapping("/languages/{id}")
    @Operation(summary = "Supprime une langue parlée")
    public ResponseEntity<ApiResponse<Void>> deleteLanguage(
            Authentication auth,
            @PathVariable UUID id) {
        profileService.deleteLanguage(currentUserId(auth), id);
        return ResponseEntity.ok(ApiResponse.success("Langue supprimée", null));
    }

    // =====================================================
    // Certifications
    // =====================================================

    @PostMapping("/certifications")
    @Operation(summary = "Ajoute une certification professionnelle")
    public ResponseEntity<ApiResponse<CertificationDto>> addCertification(
            Authentication auth,
            @Valid @RequestBody CreateCertificationRequest request) {
        CertificationDto dto = profileService.addCertification(currentUserId(auth), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Certification ajoutée", dto));
    }

    @PutMapping("/certifications/{id}")
    @Operation(summary = "Met à jour une certification")
    public ResponseEntity<ApiResponse<CertificationDto>> updateCertification(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody CreateCertificationRequest request) {
        CertificationDto dto = profileService.updateCertification(currentUserId(auth), id, request);
        return ResponseEntity.ok(ApiResponse.success("Certification mise à jour", dto));
    }

    @DeleteMapping("/certifications/{id}")
    @Operation(summary = "Supprime une certification")
    public ResponseEntity<ApiResponse<Void>> deleteCertification(
            Authentication auth,
            @PathVariable UUID id) {
        profileService.deleteCertification(currentUserId(auth), id);
        return ResponseEntity.ok(ApiResponse.success("Certification supprimée", null));
    }

    // =====================================================
    // Helpers
    // =====================================================

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
