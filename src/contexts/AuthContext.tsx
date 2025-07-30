import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useStore } from '@/store/useStore';
import api from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token management utilities
const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
const getTokenExpiry = () => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
};

const setTokens = (token: string, refreshToken: string, expiresIn: number) => {
  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

const isTokenExpired = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  return Date.now() >= expiry - 60000; // Refresh 1 minute before expiry
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setLoading } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  // Memoize authentication status to prevent unnecessary recalculations
  const isAuthenticated = useMemo(() => !!user && !!getStoredToken(), [user]);

  // Auto refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken,
      });

      const {
        token,
        refreshToken: newRefreshToken,
        expiresIn,
        user: userData,
      } = response.data;

      setTokens(token, newRefreshToken, expiresIn);
      setUser(userData);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  }, [setUser]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const response = await api.post('/auth/login', { email, password });

        const {
          token,
          refreshToken,
          expiresIn,
          user: userData,
        } = response.data;

        setTokens(token, refreshToken, expiresIn);
        setUser(userData);
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser]
  );

  // Register function
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        setIsLoading(true);
        const response = await api.post('/auth/register', {
          name,
          email,
          password,
        });

        const {
          token,
          refreshToken,
          expiresIn,
          user: userData,
        } = response.data;

        setTokens(token, refreshToken, expiresIn);
        setUser(userData);
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser]
  );

  // Logout function
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setLoading(false);
  }, [setUser, setLoading]);

  // Update user function
  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (user) {
        setUser({ ...user, ...updates });
      }
    },
    [user, setUser]
  );

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (isAuthenticated && !isTokenExpired()) {
      // Set up auto-refresh 5 minutes before token expires
      const expiry = getTokenExpiry();
      if (expiry) {
        const timeUntilRefresh = expiry - Date.now() - 300000; // 5 minutes before expiry

        if (timeUntilRefresh > 0) {
          refreshInterval = setTimeout(() => {
            refreshToken();
          }, timeUntilRefresh);
        }
      }
    }

    return () => {
      if (refreshInterval) {
        clearTimeout(refreshInterval);
      }
    };
  }, [isAuthenticated, refreshToken]);

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getStoredToken();

        if (!token) {
          setIsLoading(false);
          return;
        }

        if (isTokenExpired()) {
          const refreshSuccess = await refreshToken();
          if (!refreshSuccess) {
            setIsLoading(false);
            return;
          }
        }

        // Verify token and get user data
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshToken, setUser, logout]);

  // Listen for logout events from axios interceptors
  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, [logout]);

  // Memoize context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    refreshToken,
    updateUser,
  }), [user, isAuthenticated, isLoading, login, logout, register, refreshToken, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
