package com.cvgen.backend.shared.util;

import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * Fabrique d'{@link ObjectMapper} tolérants, pensés pour parser les réponses
 * des LLM (Gemini) qui produisent souvent du JSON légèrement non conforme :
 * virgules traînantes, caractères de contrôle non échappés dans les chaînes,
 * champs inconnus, etc.
 *
 * <p>Centralisé pour éviter que chaque service ne plante différemment sur
 * les mêmes irrégularités.</p>
 */
public final class LenientJson {

    private LenientJson() {
    }

    /** Construit un ObjectMapper tolérant (nouvelle instance à chaque appel). */
    public static ObjectMapper mapper() {
        return JsonMapper.builder()
                .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
                .enable(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS)
                .enable(JsonReadFeature.ALLOW_SINGLE_QUOTES)
                .enable(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES)
                .build()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }

    /**
     * Nettoie le texte d'un LLM avant parsing : retire les éventuels
     * fences markdown (```json … ```) et les espaces superflus.
     */
    public static String strip(String raw) {
        if (raw == null) {
            return "";
        }
        String json = raw.trim();
        if (json.startsWith("```json")) {
            json = json.substring(7);
        } else if (json.startsWith("```")) {
            json = json.substring(3);
        }
        if (json.endsWith("```")) {
            json = json.substring(0, json.length() - 3);
        }
        return json.trim();
    }
}
