package com.cvgen.backend.profile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Projet personnel/technique extrait d'un CV.
 *
 * <p>Pas (encore) d'entité {@code ProjectEntity} en base : ce DTO sert
 * uniquement à transporter l'information depuis le parser jusqu'à la
 * prévisualisation côté frontend. Le stockage côté backend sera ajouté
 * dans un futur sprint.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedProjectDto {

    /** Nom / titre du projet. */
    private String name;

    /** Description courte (peut contenir plusieurs bullet points concaténés). */
    private String description;

    /** Stack technique détectée (ex: "Java, Spring Boot, PostgreSQL"). */
    private String techStack;

    /** Lien éventuel (GitHub, démo, etc.). */
    private String url;

    /** Date de début si détectée. */
    private LocalDate startDate;

    /** Date de fin si détectée. */
    private LocalDate endDate;

    /** Bullet points bruts détectés dans le bloc projet. */
    private List<String> bullets;
}
