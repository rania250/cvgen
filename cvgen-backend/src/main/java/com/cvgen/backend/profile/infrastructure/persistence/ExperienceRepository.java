package com.cvgen.backend.profile.infrastructure.persistence;

import com.cvgen.backend.profile.infrastructure.persistence.entity.ExperienceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository Spring Data pour {@link ExperienceEntity}.
 */
@Repository
public interface ExperienceRepository extends JpaRepository<ExperienceEntity, UUID> {

    List<ExperienceEntity> findByUserIdOrderByDisplayOrderAsc(UUID userId);

    List<ExperienceEntity> findByUserIdOrderByStartDateDesc(UUID userId);
}
