// =====================================================
// Types miroir des DTOs backend (com.cvgen.backend.profile)
// =====================================================

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE';

// --- Expérience professionnelle ---
export interface ExperienceDto {
  id: string;
  jobTitle: string;
  company: string;
  location?: string | null;
  startDate: string; // ISO YYYY-MM-DD
  endDate?: string | null;
  current: boolean;
  description?: string | null;
  displayOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExperienceRequest {
  jobTitle: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  current: boolean;
  description?: string;
  displayOrder?: number;
}

// --- Formation ---
export interface EducationDto {
  id: string;
  degree?: string | null;
  school: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  displayOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEducationRequest {
  degree?: string;
  school: string;
  fieldOfStudy?: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string;
  displayOrder?: number;
}

// --- Compétence technique ---
export interface SkillDto {
  id: string;
  name: string;
  level: SkillLevel;
  category?: string | null;
  displayOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillRequest {
  name: string;
  level: SkillLevel;
  category?: string;
  displayOrder?: number;
}

// --- Langue ---
export interface LanguageDto {
  id: string;
  name: string;
  level: LanguageLevel;
  displayOrder?: number | null;
}

export interface CreateLanguageRequest {
  name: string;
  level: LanguageLevel;
  displayOrder?: number;
}

// --- Certification ---
export interface CertificationDto {
  id: string;
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialUrl?: string | null;
  displayOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificationRequest {
  name: string;
  issuer?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialUrl?: string;
  displayOrder?: number;
}

// --- Profil agrégé ---
export interface ProjectDto {
  id: string;
  name: string;
  description?: string | null;
  techStack?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  displayOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  techStack?: string;
  url?: string;
  startDate?: string | null;
  endDate?: string | null;
  displayOrder?: number;
}

export interface UserProfileDto {
  id: string;
  userId: string;
  title?: string | null;
  summary?: string | null;
  phone?: string | null;
  location?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  experiences: ExperienceDto[];
  educations: EducationDto[];
  skills: SkillDto[];
  languages: LanguageDto[];
  certifications: CertificationDto[];
  projects: ProjectDto[];
}

export interface UpdateProfileRequest {
  title?: string;
  summary?: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

// --- Import de CV parsé ---
export interface ParsedProjectDto {
  name: string;
  description?: string | null;
  techStack?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ParsedCvDto {
  profileInfo: UpdateProfileRequest;
  experiences: CreateExperienceRequest[];
  educations: CreateEducationRequest[];
  skills: CreateSkillRequest[];
  languages: CreateLanguageRequest[];
  certifications: CreateCertificationRequest[];
  projects: ParsedProjectDto[];
}
