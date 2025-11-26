import { create } from 'zustand';
import type { User } from '@/types';
import { decodeToken } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (token: string) => {
    const user = decodeToken(token);
    if (user) {
      localStorage.setItem('token', token);
      set({ token, user });
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
  initAuth: () => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = decodeToken(token);
      if (user) {
        set({ token, user });
      } else {
        localStorage.removeItem('token');
      }
    }
  },
}));
