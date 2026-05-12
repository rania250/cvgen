import { useMutation } from '@tanstack/react-query';
import { generationApi } from '@/api/generationApi';
import type { GenerateCvRequest, SelectedCvContent } from '@/types/generation.types';

export const GENERATION_QUERY_KEY = ['generation'] as const;

// =====================================================
// Mutation : génère un CV optimisé
// =====================================================
export function useGenerateCv() {
  return useMutation<SelectedCvContent, Error, GenerateCvRequest>({
    mutationFn: generationApi.generateCv,
  });
}
