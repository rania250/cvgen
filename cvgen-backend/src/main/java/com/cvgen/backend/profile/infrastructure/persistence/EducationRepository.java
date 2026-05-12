package com.cvgen.backend.profile.infrastructure.persistence;

import com.cvgen.backend.profile.infrastructure.persistence.entity.EducationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository Spring Data pour {@link EducationEntity}.
 */
@Repository
public interface EducationRepository extends JpaRepository<EducationEntity, UUID> {

    List<EducationEntity> findByUserIdOrderByDisplayOrderAsc(UUID userId);

    List<EducationEntity> findByUserIdOrderByStartDateDesc(UUID userId);
}
