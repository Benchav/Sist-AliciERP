import { create } from 'zustand';
import type { User, AuthUserPayload, Config } from '@/types';
import { decodeToken } from '@/lib/auth';
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/lib/api';
import { fetchSystemConfig } from '@/lib/configApi';

type UserLike = AuthUserPayload | User;

const normalizeUser = (input?: UserLike | null): User | null => {
  if (!input) return null;
  const role = 'role' in input && input.role ? input.role : ('rol' in input ? input.rol : undefined);
  if (!role) return null;

  return {
    id: input.id,
    username: input.username,
    role,
    nombre: 'nombre' in input ? input.nombre : undefined,
  };
};

interface AuthState {
  user: User | null;
  token: string | null;
  config: Config | null;
  isConfigLoading: boolean;
  isAuthReady: boolean;
  setAuth: (token: string, user?: UserLike | null) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  fetchConfig: () => Promise<Config | null>;
  setConfig: (config: Config | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  config: null,
  isConfigLoading: false,
  isAuthReady: false,
  setAuth: (token: string, userParam?: UserLike | null) => {
    const normalizedUser = normalizeUser(userParam) ?? decodeToken(token);

    if (normalizedUser) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUser));
      set({ token, user: normalizedUser, isAuthReady: true });
      return;
    }

    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    set({ token: null, user: null, config: null, isAuthReady: true });
  },
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    set({ token: null, user: null, config: null, isAuthReady: true });
  },
  initAuth: async () => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      set({ token: null, user: null, config: null, isAuthReady: true });
      return;
    }

    let user: User | null = null;
    const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (storedUser) {
      try {
        user = normalizeUser(JSON.parse(storedUser) as UserLike);
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = decodeToken(token);
    }

    if (user) {
      set({ token, user });
      try {
        await get().fetchConfig();
      } catch {
        // ignore config fetch errors during bootstrap
      } finally {
        set({ isAuthReady: true });
      }
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      set({ token: null, user: null, config: null, isAuthReady: true });
    }
  },
  fetchConfig: async () => {
    set({ isConfigLoading: true });
    try {
      const config = await fetchSystemConfig();
      set({ config, isConfigLoading: false });
      return config;
    } catch (error) {
      set({ isConfigLoading: false });
      throw error;
    }
  },
  setConfig: (config: Config | null) => set({ config }),
}));
