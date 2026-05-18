package com.cvgen.backend.generation.infrastructure.persistence;

import com.cvgen.backend.generation.infrastructure.persistence.entity.GeneratedCvEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository Spring Data pour GeneratedCvEntity.
 */
@Repository
public interface GeneratedCvRepository extends JpaRepository<GeneratedCvEntity, UUID> {

    /**
     * Récupère tous les CVs générés d'un utilisateur, triés par date décroissante.
     */
    List<GeneratedCvEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
