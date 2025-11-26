import { create } from 'zustand';
import type { User } from '@/types';
import { decodeToken } from '@/lib/auth';
import { AUTH_TOKEN_STORAGE_KEY } from '@/lib/api';

const AUTH_USER_STORAGE_KEY = 'sist-alici-user';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user?: User | null) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (token: string, userParam?: User | null) => {
    const user = userParam ?? decodeToken(token);
    if (user) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      set({ token, user });
    }
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
          user = JSON.parse(storedUser) as User;
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
