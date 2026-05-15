import { axiosInstance } from './axiosInstance';
import type {
  CertificationDto,
  CreateCertificationRequest,
  CreateEducationRequest,
  CreateExperienceRequest,
  CreateLanguageRequest,
  CreateProjectRequest,
  CreateSkillRequest,
  EducationDto,
  ExperienceDto,
  LanguageDto,
  ParsedCvDto,
  ProjectDto,
  SkillDto,
  UpdateProfileRequest,
  UserProfileDto,
} from '@/types/profile.types';

// Enveloppe ApiResponse côté backend
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

const unwrap = <T,>(payload: ApiEnvelope<T>): T => payload.data;

const BASE = '/api/profile';

// =====================================================
// Profil principal
// =====================================================
export const profileApi = {
  getProfile: async (): Promise<UserProfileDto> => {
    const { data } = await axiosInstance.get<ApiEnvelope<UserProfileDto>>(BASE);
    return unwrap(data);
  },

  updateProfile: async (payload: UpdateProfileRequest): Promise<UserProfileDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<UserProfileDto>>(BASE, payload);
    return unwrap(data);
  },

  // --- Experiences ---
  addExperience: async (payload: CreateExperienceRequest): Promise<ExperienceDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<ExperienceDto>>(
      `${BASE}/experiences`,
      payload,
    );
    return unwrap(data);
  },
  updateExperience: async (
    id: string,
    payload: CreateExperienceRequest,
  ): Promise<ExperienceDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<ExperienceDto>>(
      `${BASE}/experiences/${id}`,
      payload,
    );
    return unwrap(data);
  },
  deleteExperience: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/experiences/${id}`);
  },

  // --- Educations ---
  addEducation: async (payload: CreateEducationRequest): Promise<EducationDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<EducationDto>>(
      `${BASE}/educations`,
      payload,
    );
    return unwrap(data);
  },
  updateEducation: async (
    id: string,
    payload: CreateEducationRequest,
  ): Promise<EducationDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<EducationDto>>(
      `${BASE}/educations/${id}`,
      payload,
    );
    return unwrap(data);
  },
  deleteEducation: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/educations/${id}`);
  },

  // --- Skills ---
  addSkill: async (payload: CreateSkillRequest): Promise<SkillDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<SkillDto>>(
      `${BASE}/skills`,
      payload,
    );
    return unwrap(data);
  },
  updateSkill: async (id: string, payload: CreateSkillRequest): Promise<SkillDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<SkillDto>>(
      `${BASE}/skills/${id}`,
      payload,
    );
    return unwrap(data);
  },
  deleteSkill: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/skills/${id}`);
  },

  // --- Languages ---
  addLanguage: async (payload: CreateLanguageRequest): Promise<LanguageDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<LanguageDto>>(
      `${BASE}/languages`,
      payload,
    );
    return unwrap(data);
  },
  updateLanguage: async (
    id: string,
    payload: CreateLanguageRequest,
  ): Promise<LanguageDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<LanguageDto>>(
      `${BASE}/languages/${id}`,
      payload,
    );
    return unwrap(data);
  },
  deleteLanguage: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/languages/${id}`);
  },

  // --- Certifications ---
  addCertification: async (
    payload: CreateCertificationRequest,
  ): Promise<CertificationDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<CertificationDto>>(
      `${BASE}/certifications`,
      payload,
    );
    return unwrap(data);
  },
  updateCertification: async (
    id: string,
    payload: CreateCertificationRequest,
  ): Promise<CertificationDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<CertificationDto>>(
      `${BASE}/certifications/${id}`,
      payload,
    );
    return unwrap(data);
  },
  deleteCertification: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/certifications/${id}`);
  },

  // --- Projects ---
  addProject: async (payload: CreateProjectRequest): Promise<ProjectDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<ProjectDto>>(
      `${BASE}/projects`,
      payload,
    );
    return unwrap(data);
  },
  updateProject: async (
    id: string,
    payload: CreateProjectRequest,
  ): Promise<ProjectDto> => {
    const { data } = await axiosInstance.put<ApiEnvelope<ProjectDto>>(
      `${BASE}/projects/${id}`,
      payload,
    );
    return unwrap(data);
  },
  deleteProject: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/projects/${id}`);
  },

  // --- Import CV (2-step flow: parse then apply) ---
  parseCv: async (file: File): Promise<ParsedCvDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axiosInstance.post<ApiEnvelope<ParsedCvDto>>(
      `${BASE}/import/parse`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return unwrap(data);
  },

  applyCv: async (dto: ParsedCvDto): Promise<UserProfileDto> => {
    const { data } = await axiosInstance.post<ApiEnvelope<UserProfileDto>>(
      `${BASE}/import/apply`,
      dto,
    );
    return unwrap(data);
  },
};
