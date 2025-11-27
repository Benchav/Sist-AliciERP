import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios';
import { getApiErrorMessage, type ApiErrorPayload } from './errors';

const DEFAULT_API_URL = 'https://sist-alici.vercel.app';

const sanitizeBaseUrl = (url: string): string => url.replace(/\/$/, '');

const rawEnvApiUrl = import.meta.env.VITE_API_URL?.trim();

const API_BASE_URL = sanitizeBaseUrl(
  rawEnvApiUrl && rawEnvApiUrl.length > 0 ? rawEnvApiUrl : DEFAULT_API_URL
);

export const AUTH_TOKEN_STORAGE_KEY = 'sist-alici-token';

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const attachAuthToken = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    let headers = config.headers;
    if (!headers || typeof headers === 'function') {
      headers = new AxiosHeaders();
    } else if (!(headers instanceof AxiosHeaders)) {
      headers = new AxiosHeaders(headers);
    }

    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
};

api.interceptors.request.use(attachAuthToken);

const handleUnauthorized = () => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }

    error.message = getApiErrorMessage(error);
    return Promise.reject(error);
  }
);
