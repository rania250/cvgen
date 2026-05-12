import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Instance Axios partagée pour tous les appels API
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Intercepteur requête : injection du token Bearer ---
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Récupère le token depuis localStorage (persisté par Zustand)
    const authData = localStorage.getItem('cvgen-auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed?.state?.accessToken) {
          config.headers.Authorization = `Bearer ${parsed.state.accessToken}`;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// --- Intercepteur réponse : déconnexion automatique sur 401 ---
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth from localStorage
      localStorage.removeItem('cvgen-auth');
      // Redirection vers la page de connexion (hors React Router pour simplicité)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
