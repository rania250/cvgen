package com.cvgen.backend.profile.application;

import com.cvgen.backend.auth.infrastructure.persistence.UserJpaRepository;
import com.cvgen.backend.auth.infrastructure.persistence.entity.UserEntity;
import com.cvgen.backend.profile.api.dto.CertificationDto;
import com.cvgen.backend.profile.api.dto.CreateCertificationRequest;
import com.cvgen.backend.profile.api.dto.CreateEducationRequest;
import com.cvgen.backend.profile.api.dto.CreateExperienceRequest;
import com.cvgen.backend.profile.api.dto.CreateLanguageRequest;
import com.cvgen.backend.profile.api.dto.CreateProjectRequest;
import com.cvgen.backend.profile.api.dto.CreateSkillRequest;
import com.cvgen.backend.profile.api.dto.EducationDto;
import com.cvgen.backend.profile.api.dto.ExperienceDto;
import com.cvgen.backend.profile.api.dto.LanguageDto;
import com.cvgen.backend.profile.api.dto.ProjectDto;
import com.cvgen.backend.profile.api.dto.SkillDto;
import com.cvgen.backend.profile.api.dto.UpdateProfileRequest;
import com.cvgen.backend.profile.api.dto.UserProfileDto;
import com.cvgen.backend.profile.infrastructure.persistence.CertificationRepository;
import com.cvgen.backend.profile.infrastructure.persistence.EducationRepository;
import com.cvgen.backend.profile.infrastructure.persistence.ExperienceRepository;
import com.cvgen.backend.profile.infrastructure.persistence.LanguageRepository;
import com.cvgen.backend.profile.infrastructure.persistence.ProjectRepository;
import com.cvgen.backend.profile.infrastructure.persistence.SkillRepository;
import com.cvgen.backend.profile.infrastructure.persistence.UserProfileRepository;
import com.cvgen.backend.profile.infrastructure.persistence.entity.CertificationEntity;
import com.cvgen.backend.profile.infrastructure.persistence.entity.EducationEntity;
import com.cvgen.backend.profile.infrastructure.persistence.entity.ExperienceEntity;
import com.cvgen.backend.profile.infrastructure.persistence.entity.LanguageEntity;
import com.cvgen.backend.profile.infrastructure.persistence.entity.ProjectEntity;
import com.cvgen.backend.profile.infrastructure.persistence.entity.SkillEntity;
import com.cvgen.backend.profile.infrastructure.persistence.entity.UserProfileEntity;
import com.cvgen.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service métier du module profil : agrégat du CV (profil + collections rattachées).
 *
 * <p>Toutes les opérations de modification vérifient que la ressource ciblée
 * appartient bien à l'utilisateur courant (sinon {@link AccessDeniedException}).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ProfileService {

    private final UserJpaRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final ExperienceRepository experienceRepository;
    private final EducationRepository educationRepository;
    private final SkillRepository skillRepository;
    private final LanguageRepository languageRepository;
    private final CertificationRepository certificationRepository;
    private final ProjectRepository projectRepository;

    // =====================================================
    // Profil principal
    // =====================================================

    @Transactional(readOnly = true)
    public UserProfileDto getUserProfile(UUID userId) {
        UserProfileEntity profile = findOrCreateProfile(userId);
        return aggregate(profile);
    }

    public UserProfileDto updateProfile(UUID userId, UpdateProfileRequest req) {
        UserProfileEntity profile = findOrCreateProfile(userId);

        // PATCH-like : on ne touche qu'aux champs explicitement fournis
        if (req.getTitle() != null) profile.setTitle(req.getTitle());
        if (req.getSummary() != null) profile.setSummary(req.getSummary());
        if (req.getPhone() != null) profile.setPhone(req.getPhone());
        if (req.getLocation() != null) profile.setLocation(req.getLocation());
        if (req.getPhotoUrl() != null) profile.setPhotoUrl(req.getPhotoUrl());
        if (req.getLinkedinUrl() != null) profile.setLinkedinUrl(req.getLinkedinUrl());
        if (req.getGithubUrl() != null) profile.setGithubUrl(req.getGithubUrl());
        if (req.getPortfolioUrl() != null) profile.setPortfolioUrl(req.getPortfolioUrl());

        profileRepository.save(profile);
        return aggregate(profile);
    }

    // =====================================================
    // Experiences
    // =====================================================

    public ExperienceDto addExperience(UUID userId, CreateExperienceRequest req) {
        UserEntity user = requireUser(userId);
        ExperienceEntity entity = ExperienceEntity.builder()
                .user(user)
                .jobTitle(req.getJobTitle())
                .company(req.getCompany())
                .location(req.getLocation())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .current(req.isCurrent())
                .description(req.getDescription())
                .build();
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(experienceRepository.save(entity));
    }

    public ExperienceDto updateExperience(UUID userId, UUID expId, CreateExperienceRequest req) {
        ExperienceEntity entity = requireOwned(experienceRepository.findById(expId), userId,
                "Expérience", expId, e -> e.getUser().getId());
        entity.setJobTitle(req.getJobTitle());
        entity.setCompany(req.getCompany());
        entity.setLocation(req.getLocation());
        entity.setStartDate(req.getStartDate());
        entity.setEndDate(req.getEndDate());
        entity.setCurrent(req.isCurrent());
        entity.setDescription(req.getDescription());
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(experienceRepository.save(entity));
    }

    public void deleteExperience(UUID userId, UUID expId) {
        ExperienceEntity entity = requireOwned(experienceRepository.findById(expId), userId,
                "Expérience", expId, e -> e.getUser().getId());
        experienceRepository.delete(entity);
    }

    public void reorderExperiences(UUID userId, List<UUID> orderedIds) {
        List<ExperienceEntity> entities = experienceRepository.findAllById(orderedIds);
        assertOwnership(entities, orderedIds, userId, "Expérience", e -> e.getUser().getId());
        applyOrder(entities, orderedIds, ExperienceEntity::setDisplayOrder);
        experienceRepository.saveAll(entities);
    }

    // =====================================================
    // Educations
    // =====================================================

    public EducationDto addEducation(UUID userId, CreateEducationRequest req) {
        UserEntity user = requireUser(userId);
        EducationEntity entity = EducationEntity.builder()
                .user(user)
                .degree(req.getDegree())
                .school(req.getSchool())
                .fieldOfStudy(req.getFieldOfStudy())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .description(req.getDescription())
                .build();
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(educationRepository.save(entity));
    }

    public EducationDto updateEducation(UUID userId, UUID eduId, CreateEducationRequest req) {
        EducationEntity entity = requireOwned(educationRepository.findById(eduId), userId,
                "Formation", eduId, e -> e.getUser().getId());
        entity.setDegree(req.getDegree());
        entity.setSchool(req.getSchool());
        entity.setFieldOfStudy(req.getFieldOfStudy());
        entity.setStartDate(req.getStartDate());
        entity.setEndDate(req.getEndDate());
        entity.setDescription(req.getDescription());
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(educationRepository.save(entity));
    }

    public void deleteEducation(UUID userId, UUID eduId) {
        EducationEntity entity = requireOwned(educationRepository.findById(eduId), userId,
                "Formation", eduId, e -> e.getUser().getId());
        educationRepository.delete(entity);
    }

    public void reorderEducations(UUID userId, List<UUID> orderedIds) {
        List<EducationEntity> entities = educationRepository.findAllById(orderedIds);
        assertOwnership(entities, orderedIds, userId, "Formation", e -> e.getUser().getId());
        applyOrder(entities, orderedIds, EducationEntity::setDisplayOrder);
        educationRepository.saveAll(entities);
    }

    // =====================================================
    // Skills
    // =====================================================

    public SkillDto addSkill(UUID userId, CreateSkillRequest req) {
        UserEntity user = requireUser(userId);
        SkillEntity entity = SkillEntity.builder()
                .user(user)
                .name(req.getName())
                .level(req.getLevel())
                .category(req.getCategory())
                .build();
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(skillRepository.save(entity));
    }

    public SkillDto updateSkill(UUID userId, UUID skillId, CreateSkillRequest req) {
        SkillEntity entity = requireOwned(skillRepository.findById(skillId), userId,
                "Compétence", skillId, s -> s.getUser().getId());
        entity.setName(req.getName());
        entity.setLevel(req.getLevel());
        entity.setCategory(req.getCategory());
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(skillRepository.save(entity));
    }

    public void deleteSkill(UUID userId, UUID skillId) {
        SkillEntity entity = requireOwned(skillRepository.findById(skillId), userId,
                "Compétence", skillId, s -> s.getUser().getId());
        skillRepository.delete(entity);
    }

    public void reorderSkills(UUID userId, List<UUID> orderedIds) {
        List<SkillEntity> entities = skillRepository.findAllById(orderedIds);
        assertOwnership(entities, orderedIds, userId, "Compétence", s -> s.getUser().getId());
        applyOrder(entities, orderedIds, SkillEntity::setDisplayOrder);
        skillRepository.saveAll(entities);
    }

    // =====================================================
    // Languages
    // =====================================================

    public LanguageDto addLanguage(UUID userId, CreateLanguageRequest req) {
        UserEntity user = requireUser(userId);
        LanguageEntity entity = LanguageEntity.builder()
                .user(user)
                .name(req.getName())
                .level(req.getLevel())
                .build();
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(languageRepository.save(entity));
    }

    public LanguageDto updateLanguage(UUID userId, UUID langId, CreateLanguageRequest req) {
        LanguageEntity entity = requireOwned(languageRepository.findById(langId), userId,
                "Langue", langId, l -> l.getUser().getId());
        entity.setName(req.getName());
        entity.setLevel(req.getLevel());
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(languageRepository.save(entity));
    }

    public void deleteLanguage(UUID userId, UUID langId) {
        LanguageEntity entity = requireOwned(languageRepository.findById(langId), userId,
                "Langue", langId, l -> l.getUser().getId());
        languageRepository.delete(entity);
    }

    // =====================================================
    // Certifications
    // =====================================================

    public CertificationDto addCertification(UUID userId, CreateCertificationRequest req) {
        UserEntity user = requireUser(userId);
        CertificationEntity entity = CertificationEntity.builder()
                .user(user)
                .name(req.getName())
                .issuer(req.getIssuer())
                .issueDate(req.getIssueDate())
                .expiryDate(req.getExpiryDate())
                .credentialUrl(req.getCredentialUrl())
                .build();
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(certificationRepository.save(entity));
    }

    public CertificationDto updateCertification(UUID userId, UUID certId, CreateCertificationRequest req) {
        CertificationEntity entity = requireOwned(certificationRepository.findById(certId), userId,
                "Certification", certId, c -> c.getUser().getId());
        entity.setName(req.getName());
        entity.setIssuer(req.getIssuer());
        entity.setIssueDate(req.getIssueDate());
        entity.setExpiryDate(req.getExpiryDate());
        entity.setCredentialUrl(req.getCredentialUrl());
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(certificationRepository.save(entity));
    }

    public void deleteCertification(UUID userId, UUID certId) {
        CertificationEntity entity = requireOwned(certificationRepository.findById(certId), userId,
                "Certification", certId, c -> c.getUser().getId());
        certificationRepository.delete(entity);
    }

    // =====================================================
    // Projects
    // =====================================================

    public ProjectDto addProject(UUID userId, CreateProjectRequest req) {
        UserEntity user = requireUser(userId);
        ProjectEntity entity = ProjectEntity.builder()
                .user(user)
                .name(req.getName())
                .description(req.getDescription())
                .techStack(req.getTechStack())
                .url(req.getUrl())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .build();
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(projectRepository.save(entity));
    }

    public ProjectDto updateProject(UUID userId, UUID projectId, CreateProjectRequest req) {
        ProjectEntity entity = requireOwned(projectRepository.findById(projectId), userId,
                "Projet", projectId, p -> p.getUser().getId());
        entity.setName(req.getName());
        entity.setDescription(req.getDescription());
        entity.setTechStack(req.getTechStack());
        entity.setUrl(req.getUrl());
        entity.setStartDate(req.getStartDate());
        entity.setEndDate(req.getEndDate());
        if (req.getDisplayOrder() != null) entity.setDisplayOrder(req.getDisplayOrder());
        return toDto(projectRepository.save(entity));
    }

    public void deleteProject(UUID userId, UUID projectId) {
        ProjectEntity entity = requireOwned(projectRepository.findById(projectId), userId,
                "Projet", projectId, p -> p.getUser().getId());
        projectRepository.delete(entity);
    }

    // =====================================================
    // Helpers : ownership, agrégation, mapping
    // =====================================================

    private UserEntity requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userId));
    }

    private UserProfileEntity findOrCreateProfile(UUID userId) {
        return profileRepository.findByUserId(userId)
                .orElseGet(() -> profileRepository.save(
                        UserProfileEntity.builder().user(requireUser(userId)).build()));
    }

    /**
     * Récupère l'entité, lève 404 si absente, 403 si elle n'appartient pas à {@code userId}.
     */
    private <T> T requireOwned(java.util.Optional<T> optional, UUID userId,
                               String label, UUID id, Function<T, UUID> ownerExtractor) {
        T entity = optional.orElseThrow(() ->
                new ResourceNotFoundException(label + " introuvable : " + id));
        if (!ownerExtractor.apply(entity).equals(userId)) {
            throw new AccessDeniedException("Cette ressource ne vous appartient pas");
        }
        return entity;
    }

    /**
     * Vérifie que toutes les entités d'un reorder sont présentes et appartiennent à l'utilisateur.
     */
    private <T> void assertOwnership(List<T> entities, List<UUID> requestedIds, UUID userId,
                                     String label, Function<T, UUID> ownerExtractor) {
        if (entities.size() != requestedIds.size()) {
            throw new ResourceNotFoundException(
                    "Une ou plusieurs entités " + label.toLowerCase() + " sont introuvables");
        }
        for (T e : entities) {
            if (!ownerExtractor.apply(e).equals(userId)) {
                throw new AccessDeniedException("Cette ressource ne vous appartient pas");
            }
        }
    }

    /**
     * Applique l'ordre demandé à la liste : displayOrder = index dans orderedIds.
     */
    private <T> void applyOrder(List<T> entities, List<UUID> orderedIds,
                                java.util.function.BiConsumer<T, Integer> setter) {
        // Build une map id -> entity pour retrouver rapidement
        Map<UUID, T> byId = entities.stream().collect(Collectors.toMap(
                e -> {
                    try {
                        return (UUID) e.getClass().getMethod("getId").invoke(e);
                    } catch (ReflectiveOperationException ex) {
                        throw new IllegalStateException(ex);
                    }
                },
                Function.identity()));
        for (int i = 0; i < orderedIds.size(); i++) {
            setter.accept(byId.get(orderedIds.get(i)), i);
        }
    }

    // -------------------------------------------------
    // Agrégat profil complet
    // -------------------------------------------------
    private UserProfileDto aggregate(UserProfileEntity profile) {
        UUID userId = profile.getUser().getId();

        List<ExperienceDto> experiences = experienceRepository
                .findByUserIdOrderByDisplayOrderAsc(userId).stream().map(this::toDto).toList();
        List<EducationDto> educations = educationRepository
                .findByUserIdOrderByDisplayOrderAsc(userId).stream().map(this::toDto).toList();
        List<SkillDto> skills = skillRepository
                .findByUserIdOrderByDisplayOrderAsc(userId).stream().map(this::toDto).toList();
        List<LanguageDto> languages = languageRepository
                .findByUserIdOrderByDisplayOrderAsc(userId).stream().map(this::toDto).toList();
        List<CertificationDto> certifications = certificationRepository
                .findByUserIdOrderByDisplayOrderAsc(userId).stream().map(this::toDto).toList();
        List<ProjectDto> projects = projectRepository
                .findByUserId(userId).stream().map(this::toDto).toList();

        return UserProfileDto.builder()
                .id(profile.getId())
                .userId(userId)
                .title(profile.getTitle())
                .summary(profile.getSummary())
                .phone(profile.getPhone())
                .location(profile.getLocation())
                .photoUrl(profile.getPhotoUrl())
                .linkedinUrl(profile.getLinkedinUrl())
                .githubUrl(profile.getGithubUrl())
                .portfolioUrl(profile.getPortfolioUrl())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .experiences(experiences)
                .educations(educations)
                .skills(skills)
                .languages(languages)
                .certifications(certifications)
                .projects(projects)
                .build();
    }

    // -------------------------------------------------
    // Mappers entity → DTO
    // -------------------------------------------------
    private ExperienceDto toDto(ExperienceEntity e) {
        return ExperienceDto.builder()
                .id(e.getId()).jobTitle(e.getJobTitle()).company(e.getCompany())
                .location(e.getLocation()).startDate(e.getStartDate()).endDate(e.getEndDate())
                .current(e.isCurrent()).description(e.getDescription())
                .displayOrder(e.getDisplayOrder())
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt())
                .build();
    }

    private EducationDto toDto(EducationEntity e) {
        return EducationDto.builder()
                .id(e.getId()).degree(e.getDegree()).school(e.getSchool())
                .fieldOfStudy(e.getFieldOfStudy()).startDate(e.getStartDate()).endDate(e.getEndDate())
                .description(e.getDescription()).displayOrder(e.getDisplayOrder())
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt())
                .build();
    }

    private SkillDto toDto(SkillEntity s) {
        return SkillDto.builder()
                .id(s.getId()).name(s.getName()).level(s.getLevel()).category(s.getCategory())
                .displayOrder(s.getDisplayOrder())
                .createdAt(s.getCreatedAt()).updatedAt(s.getUpdatedAt())
                .build();
    }

    private LanguageDto toDto(LanguageEntity l) {
        return LanguageDto.builder()
                .id(l.getId()).name(l.getName()).level(l.getLevel())
                .displayOrder(l.getDisplayOrder())
                .build();
    }

    private CertificationDto toDto(CertificationEntity c) {
        return CertificationDto.builder()
                .id(c.getId()).name(c.getName()).issuer(c.getIssuer())
                .issueDate(c.getIssueDate()).expiryDate(c.getExpiryDate())
                .credentialUrl(c.getCredentialUrl()).displayOrder(c.getDisplayOrder())
                .createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }

    private ProjectDto toDto(ProjectEntity p) {
        return new ProjectDto(
                p.getId(), p.getName(), p.getDescription(), p.getTechStack(),
                p.getUrl(), p.getStartDate(), p.getEndDate(),
                p.getDisplayOrder(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
