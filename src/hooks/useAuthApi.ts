import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface AuthError {
  message: string;
  field?: string;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const { login } = useAuth();

  const handleLogin = async (data: LoginData) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data.email, data.password);

      // Handle redirect after successful login
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPath;
      }

      return true;
    } catch (err: any) {
      setError({
        message:
          err.response?.data?.message || 'Login failed. Please try again.',
        field: err.response?.data?.field,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login: handleLogin,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const { register } = useAuth();

  const handleRegister = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      await register(data.name, data.email, data.password);
      return true;
    } catch (err: any) {
      setError({
        message:
          err.response?.data?.message ||
          'Registration failed. Please try again.',
        field: err.response?.data?.field,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register: handleRegister,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      logout();

      // Clear any stored redirect paths
      localStorage.removeItem('redirectAfterLogin');

      // Redirect to home or login page
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logout: handleLogout,
    isLoading,
  };
}

export function useAuthStatus() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'moderator' || user?.role === 'admin',
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => user?.role && roles.includes(user.role),
  };
}

export function useTokenRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshToken } = useAuth();

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      return await refreshToken();
    } catch (err) {
      console.error('Manual token refresh failed:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    refreshToken: handleRefresh,
    isRefreshing,
  };
}
