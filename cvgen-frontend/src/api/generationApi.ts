import { axiosInstance } from './axiosInstance';
import type { SelectedCvContent, GenerateCvRequest } from '@/types/generation.types';

// Enveloppe ApiResponse côté backend
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

const unwrap = <T>(payload: ApiEnvelope<T>): T => payload.data;

const BASE = '/api/generation';

// =====================================================
// Génération de CV
// =====================================================
export const generationApi = {
  /**
   * Génère un CV optimisé pour une offre d'emploi.
   * @param request Contient le texte de l'offre
   * @returns Le CV généré avec le contenu sélectionné
   */
  generateCv: async (request: GenerateCvRequest): Promise<SelectedCvContent> => {
    const { data } = await axiosInstance.post<ApiEnvelope<SelectedCvContent>>(
      `${BASE}/generate`,
      request
    );
    return unwrap(data);
  },
};
