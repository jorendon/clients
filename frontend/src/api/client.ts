import axios from 'axios';
import { LANG_STORAGE_KEY } from '../i18n';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// El backend traduce sus errores según este header (es/en)
apiClient.interceptors.request.use((config) => {
  const lang = localStorage.getItem(LANG_STORAGE_KEY) ?? 'es';
  config.headers.set('Accept-Language', lang);
  const token = localStorage.getItem('w9-token');
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

// Sesión expirada o inválida → limpiar y volver al login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('w9-token');
      localStorage.removeItem('w9-user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
