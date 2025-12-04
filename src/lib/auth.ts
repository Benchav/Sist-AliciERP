import { jwtDecode } from 'jwt-decode';
import type { User, UserRole } from '@/types';

interface JWTPayload {
  id?: string;
  sub?: string;
  userId?: string;
  username?: string;
  role?: UserRole;
  exp?: number;
}

const resolveUserId = (payload: JWTPayload): string | null => {
  return payload.id ?? payload.userId ?? payload.sub ?? null;
};

export const decodeToken = (token: string): User | null => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }

    const id = resolveUserId(decoded);
    if (!id || !decoded.username || !decoded.role) {
      return null;
    }

    return {
      id,
      username: decoded.username,
      role: decoded.role,
    };
  } catch {
    return null;
  }
};

export const hasRole = (user: User | null, allowedRoles: UserRole[]): boolean => {
  if (!user) return false;
  return allowedRoles.includes(user.role);
};
