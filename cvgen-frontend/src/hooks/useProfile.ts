import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/api/profileApi';
import type {
  CreateCertificationRequest,
  CreateEducationRequest,
  CreateExperienceRequest,
  CreateLanguageRequest,
  CreateSkillRequest,
  UpdateProfileRequest,
  UserProfileDto,
} from '@/types/profile.types';

export const PROFILE_QUERY_KEY = ['profile'] as const;

// =====================================================
// Query : récupère le profil complet
// =====================================================
export function useGetProfile() {
  return useQuery<UserProfileDto>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: profileApi.getProfile,
  });
}

// =====================================================
// Mutations : invalident automatiquement ['profile']
// =====================================================
export function useProfileMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });

  // --- Profil ---
  const updateProfile = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => profileApi.updateProfile(payload),
    onSuccess: invalidate,
  });

  // --- Experiences ---
  const addExperience = useMutation({
    mutationFn: (payload: CreateExperienceRequest) => profileApi.addExperience(payload),
    onSuccess: invalidate,
  });
  const updateExperience = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateExperienceRequest }) =>
      profileApi.updateExperience(id, payload),
    onSuccess: invalidate,
  });
  const deleteExperience = useMutation({
    mutationFn: (id: string) => profileApi.deleteExperience(id),
    onSuccess: invalidate,
  });

  // --- Educations ---
  const addEducation = useMutation({
    mutationFn: (payload: CreateEducationRequest) => profileApi.addEducation(payload),
    onSuccess: invalidate,
  });
  const updateEducation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateEducationRequest }) =>
      profileApi.updateEducation(id, payload),
    onSuccess: invalidate,
  });
  const deleteEducation = useMutation({
    mutationFn: (id: string) => profileApi.deleteEducation(id),
    onSuccess: invalidate,
  });

  // --- Skills ---
  const addSkill = useMutation({
    mutationFn: (payload: CreateSkillRequest) => profileApi.addSkill(payload),
    onSuccess: invalidate,
  });
  const updateSkill = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateSkillRequest }) =>
      profileApi.updateSkill(id, payload),
    onSuccess: invalidate,
  });
  const deleteSkill = useMutation({
    mutationFn: (id: string) => profileApi.deleteSkill(id),
    onSuccess: invalidate,
  });

  // --- Languages ---
  const addLanguage = useMutation({
    mutationFn: (payload: CreateLanguageRequest) => profileApi.addLanguage(payload),
    onSuccess: invalidate,
  });
  const updateLanguage = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateLanguageRequest }) =>
      profileApi.updateLanguage(id, payload),
    onSuccess: invalidate,
  });
  const deleteLanguage = useMutation({
    mutationFn: (id: string) => profileApi.deleteLanguage(id),
    onSuccess: invalidate,
  });

  // --- Certifications ---
  const addCertification = useMutation({
    mutationFn: (payload: CreateCertificationRequest) =>
      profileApi.addCertification(payload),
    onSuccess: invalidate,
  });
  const updateCertification = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateCertificationRequest;
    }) => profileApi.updateCertification(id, payload),
    onSuccess: invalidate,
  });
  const deleteCertification = useMutation({
    mutationFn: (id: string) => profileApi.deleteCertification(id),
    onSuccess: invalidate,
  });

  return {
    updateProfile,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    addSkill,
    updateSkill,
    deleteSkill,
    addLanguage,
    updateLanguage,
    deleteLanguage,
    addCertification,
    updateCertification,
    deleteCertification,
  };
}
