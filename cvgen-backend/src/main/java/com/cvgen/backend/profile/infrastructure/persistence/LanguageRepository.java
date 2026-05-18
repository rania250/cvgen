package com.cvgen.backend.profile.infrastructure.persistence;

import com.cvgen.backend.profile.infrastructure.persistence.entity.LanguageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository Spring Data pour {@link LanguageEntity}.
 */
@Repository
public interface LanguageRepository extends JpaRepository<LanguageEntity, UUID> {

    List<LanguageEntity> findByUserIdOrderByDisplayOrderAsc(UUID userId);
}
