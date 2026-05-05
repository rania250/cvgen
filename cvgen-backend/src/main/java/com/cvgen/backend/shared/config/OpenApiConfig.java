package com.cvgen.backend.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration Swagger / OpenAPI 3 pour CVGen.
 * Active l'authentification Bearer JWT globalement,
 * sauf sur les endpoints publics /api/auth/**.
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI cvgenOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CVGen API")
                        .version("1.0.0")
                        .description("API de la plateforme CVGen - Génération intelligente de CV"))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")))
                // Exigence globale : tous les endpoints requièrent un Bearer token...
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }

    /**
     * Groupe "auth" : endpoints publics, exclus de l'exigence Bearer globale.
     */
    @Bean
    public GroupedOpenApi authApi() {
        return GroupedOpenApi.builder()
                .group("auth")
                .pathsToMatch("/api/auth/**")
                .addOpenApiCustomizer(openApi -> openApi.setSecurity(java.util.List.of()))
                .build();
    }

    /**
     * Groupe "secured" : tous les autres endpoints, soumis au Bearer.
     */
    @Bean
    public GroupedOpenApi securedApi() {
        return GroupedOpenApi.builder()
                .group("secured")
                .pathsToMatch("/api/**")
                .pathsToExclude("/api/auth/**")
                .build();
    }
}
