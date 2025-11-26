import { jwtDecode } from 'jwt-decode';
import type { User, UserRole } from '@/types';

interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  exp: number;
}

export const decodeToken = (token: string): User | null => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
};

export const hasRole = (user: User | null, allowedRoles: UserRole[]): boolean => {
  if (!user) return false;
  return allowedRoles.includes(user.role);
};
