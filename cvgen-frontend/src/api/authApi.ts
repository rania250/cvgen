import { axiosInstance } from './axiosInstance';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth.types';

// Enveloppe ApiResponse standardisée du backend
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

// --- Endpoints d'authentification ---
export const authApi = {
  register: async (payload: RegisterRequest): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post<ApiEnvelope<AuthResponse>>(
      '/api/auth/register',
      payload,
    );
    return data.data;
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post<ApiEnvelope<AuthResponse>>(
      '/api/auth/login',
      payload,
    );
    return data.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post<ApiEnvelope<AuthResponse>>(
      '/api/auth/refresh',
      { refreshToken },
    );
    return data.data;
  },
};
