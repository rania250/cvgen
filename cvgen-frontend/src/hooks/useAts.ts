import { useMutation } from '@tanstack/react-query';
import { atsApi } from '@/api/atsApi';
import type { AnalyzeAtsRequest, AtsScore } from '@/types/ats.types';

export function useAnalyzeAts() {
  return useMutation<AtsScore, Error, AnalyzeAtsRequest>({
    mutationFn: atsApi.analyze,
  });
}
