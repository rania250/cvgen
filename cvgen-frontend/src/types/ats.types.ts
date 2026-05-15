export interface AtsScore {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
  strongPoints: string[];
}

export interface AnalyzeAtsRequest {
  cvText: string;
  offerText: string;
}
