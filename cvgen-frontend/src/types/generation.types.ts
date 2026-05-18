// =====================================================
// Types pour la génération de CV
// =====================================================

export interface SelectedExperience {
  jobTitle: string;
  company: string;
  location?: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate?: string | null; // ISO YYYY-MM-DD ou null
  current: boolean;
  description?: string;
}

export interface SelectedEducation {
  degree?: string;
  school: string;
  fieldOfStudy?: string;
  startDate?: string; // ISO YYYY-MM-DD
  endDate?: string; // ISO YYYY-MM-DD
}

export interface SelectedProject {
  name: string;
  description?: string;
  techStack?: string;
  url?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface SelectedSkill {
  name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category?: string;
}

export interface SelectedLanguage {
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE';
}

export interface SelectedCertification {
  name: string;
  issuer?: string;
  issueDate?: string; // ISO YYYY-MM-DD
}

export interface SelectedCvContent {
  generatedCvId: string;
  title?: string;
  summary?: string;
  experiences: SelectedExperience[];
  educations: SelectedEducation[];
  projects?: SelectedProject[];
  skills: SelectedSkill[];
  languages: SelectedLanguage[];
  certifications: SelectedCertification[];
  createdAt: string;
}

export interface GenerateCvRequest {
  jobOfferText: string;
}
