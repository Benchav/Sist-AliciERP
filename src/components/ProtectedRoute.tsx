import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(user, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
