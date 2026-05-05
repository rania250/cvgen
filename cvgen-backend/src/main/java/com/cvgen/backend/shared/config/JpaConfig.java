package com.cvgen.backend.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Configuration JPA globale.
 * Active l'audit (@CreatedDate, @LastModifiedDate) sur toutes les entités.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
