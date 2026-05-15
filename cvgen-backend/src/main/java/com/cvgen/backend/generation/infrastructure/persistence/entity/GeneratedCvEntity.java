package com.cvgen.backend.generation.infrastructure.persistence.entity;

import com.cvgen.backend.auth.infrastructure.persistence.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entité JPA représentant un CV généré et optimisé par Gemini.
 */
@Entity
@Table(name = "generated_cvs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedCvEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "job_offer_text", nullable = false, columnDefinition = "TEXT")
    private String jobOfferText;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    // JSONB columns pour stocker les listes d'éléments sélectionnés
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "experiences", columnDefinition = "jsonb")
    private String experiences; // JSON array

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "educations", columnDefinition = "jsonb")
    private String educations;  // JSON array

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "projects", columnDefinition = "jsonb")
    private String projects;    // JSON array

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skills", columnDefinition = "jsonb")
    private String skills;      // JSON array

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "languages", columnDefinition = "jsonb")
    private String languages;   // JSON array

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certifications", columnDefinition = "jsonb")
    private String certifications; // JSON array

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
