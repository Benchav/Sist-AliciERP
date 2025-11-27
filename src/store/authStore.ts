import { create } from 'zustand';
import type { User, AuthUserPayload } from '@/types';
import { decodeToken } from '@/lib/auth';
import { AUTH_TOKEN_STORAGE_KEY } from '@/lib/api';

const AUTH_USER_STORAGE_KEY = 'sist-alici-user';

type UserLike = AuthUserPayload | User;

const normalizeUser = (input?: UserLike | null): User | null => {
  if (!input) return null;
  const role = 'role' in input && input.role ? input.role : ('rol' in input ? input.rol : undefined);
  if (!role) return null;

  return {
    id: input.id,
    username: input.username,
    role,
  };
};

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user?: UserLike | null) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (token: string, userParam?: UserLike | null) => {
    const normalizedUser = normalizeUser(userParam) ?? decodeToken(token);

    if (normalizedUser) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUser));
      set({ token, user: normalizedUser });
      return;
    }

    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    set({ token: null, user: null });
  },
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    set({ token: null, user: null });
  },
  initAuth: () => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      let user: User | null = null;
      const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (storedUser) {
        try {
          user = normalizeUser(JSON.parse(storedUser) as UserLike);
        } catch (error) {
          user = null;
        }
      }

      if (!user) {
        user = decodeToken(token);
      }

      if (user) {
        set({ token, user });
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }
    }
  },
}));
