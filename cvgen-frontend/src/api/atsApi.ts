import { axiosInstance } from './axiosInstance';
import type { AnalyzeAtsRequest, AtsScore } from '@/types/ats.types';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

const unwrap = <T>(payload: ApiEnvelope<T>): T => payload.data;

const BASE = '/api/ats';

export const atsApi = {
  analyze: async (request: AnalyzeAtsRequest): Promise<AtsScore> => {
    const { data } = await axiosInstance.post<ApiEnvelope<AtsScore>>(`${BASE}/analyze`, request);
    return unwrap(data);
  },
};
