package com.cvgen.backend.profile.infrastructure.persistence;

import com.cvgen.backend.profile.infrastructure.persistence.entity.UserProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository Spring Data pour {@link UserProfileEntity}.
 */
@Repository
public interface UserProfileRepository extends JpaRepository<UserProfileEntity, UUID> {

    Optional<UserProfileEntity> findByUserId(UUID userId);
}
