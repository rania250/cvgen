package com.cvgen.backend.profile.infrastructure.persistence;

import com.cvgen.backend.profile.infrastructure.persistence.entity.CertificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository Spring Data pour {@link CertificationEntity}.
 */
@Repository
public interface CertificationRepository extends JpaRepository<CertificationEntity, UUID> {

    List<CertificationEntity> findByUserIdOrderByDisplayOrderAsc(UUID userId);

    List<CertificationEntity> findByUserIdOrderByIssueDateDesc(UUID userId);
}
