package com.cvgen.backend.ats.api.dto;

import java.util.List;

public record AtsScoreDto(
        int score,
        List<String> matchedKeywords,
        List<String> missingKeywords,
        List<String> matchedSkills,
        List<String> missingSkills,
        List<String> suggestions,
        List<String> strongPoints
) {}
