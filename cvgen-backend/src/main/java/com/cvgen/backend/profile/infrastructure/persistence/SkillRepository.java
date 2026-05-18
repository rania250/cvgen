package com.cvgen.backend.profile.infrastructure.persistence;

import com.cvgen.backend.profile.infrastructure.persistence.entity.SkillEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository Spring Data pour {@link SkillEntity}.
 */
@Repository
public interface SkillRepository extends JpaRepository<SkillEntity, UUID> {

    List<SkillEntity> findByUserIdOrderByDisplayOrderAsc(UUID userId);

    List<SkillEntity> findByUserIdAndCategory(UUID userId, String category);
}
